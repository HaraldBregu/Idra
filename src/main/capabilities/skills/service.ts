import fs from 'node:fs';
import path from 'node:path';
import type { LoggerService } from '../../observability';
import type { UserDataDirectoryServicePort } from '../../storage/user-data';
import { resolveDefaultUserDataPath } from '../../storage/user-data';
import type {
	SkillDetails,
	SkillDownloadResult,
	SkillImportResult,
	SkillInfo,
	SkillSearchOptions,
	SkillSearchResult,
} from '../../../shared/skills';
import type { SkillPackage } from './loader';
import { SkillDependencyResolver, SkillRegistry } from './catalog';
import { SkillDiscovery, makeDiscoveryContext, SkillPlanner, SkillRanker, SkillSelector } from './selection';
import { SkillLoader, isIgnoredSkillDirectoryName } from './loader';
import {
	DefaultSkillMemoryPolicy,
	InMemorySkillPreferenceStore,
	NoopSkillMemoryRetriever,
	SkillAuditLog,
	SkillExecutionEngine,
	SkillSafetyPolicy,
	type SkillPreferenceStore,
} from './execution/looptime';
import type {
	MemoryPolicy,
	MemoryRetriever,
	SkillConnector,
	SkillDefinition,
	SkillExecutionRequestContext,
	SkillPromptChoice,
	SkillTool,
	SkillToolContext,
	SkillUserPreferences,
} from './types';

function textResult(text: string, isError = false) {
	return {
		content: [{ type: 'text' as const, text }],
		isError,
		status: isError ? ('error' as const) : ('ok' as const),
	};
}

function toSkillId(value: string): string {
	const id = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

	if (!id) {
		throw new Error('Skill folder name must contain letters or numbers.');
	}

	return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function splitSkillIdAndVersion(
	skillId: string,
	version?: string
): { skillId: string; version?: string } {
	const trimmedSkillId = skillId.trim();
	const explicitVersion = version?.trim();
	const atIndex = trimmedSkillId.lastIndexOf('@');
	if (explicitVersion || atIndex <= 0 || atIndex >= trimmedSkillId.length - 1) {
		return { skillId: trimmedSkillId, version: explicitVersion || undefined };
	}
	return {
		skillId: trimmedSkillId.slice(0, atIndex),
		version: trimmedSkillId.slice(atIndex + 1),
	};
}

function normalizeSkillToolInput(args: Record<string, unknown>): Record<string, unknown> {
	const nestedInput = isRecord(args.input)
		? Object.fromEntries(
				Object.entries(args.input).filter(
					([key]) =>
						key !== 'skillId' &&
						key !== 'version' &&
						key !== 'timeoutMs' &&
						key !== 'noTimeout'
				)
			)
		: {};
	const passthroughInput = Object.fromEntries(
		Object.entries(args).filter(
			([key]) =>
				key !== 'skillId' &&
				key !== 'version' &&
				key !== 'input' &&
				key !== 'timeoutMs' &&
				key !== 'noTimeout'
		)
	);
	return { ...passthroughInput, ...nestedInput };
}

function normalizeSkillExecutionTimeout(args: Record<string, unknown>): number | null | undefined {
	if (args.noTimeout === true) return null;
	if (typeof args.timeoutMs !== 'number' || !Number.isFinite(args.timeoutMs)) return undefined;
	const timeoutMs = Math.floor(args.timeoutMs);
	return timeoutMs > 0 ? timeoutMs : null;
}

function getSkillToolString(args: Record<string, unknown>, key: 'skillId' | 'version'): string | undefined {
	if (typeof args[key] === 'string') return args[key];
	if (isRecord(args.input) && typeof args.input[key] === 'string') return args.input[key];
	return undefined;
}

function shouldCopySkillPath(root: string, sourcePath: string): boolean {
	const relativePath = path.relative(root, sourcePath);
	if (!relativePath) return true;
	return !relativePath.split(/[\\/]+/).some(isIgnoredSkillDirectoryName);
}

function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export interface SkillRuntimeInput {
	userId: string;
	sessionId: string;
	tools: SkillTool[];
	toolContext: SkillToolContext;
	connectors?: SkillConnector[];
	permissions?: string[];
	memory?: MemoryRetriever;
	memoryPolicy?: MemoryPolicy;
	signal?: AbortSignal;
}

export interface SkillsServiceOptions {
	registry?: SkillRegistry;
	preferences?: SkillPreferenceStore;
	loader?: SkillLoader;
	safetyPolicy?: SkillSafetyPolicy;
	userDataDirectory?: UserDataDirectoryServicePort;
}

export class SkillsService {
	private readonly registry: SkillRegistry;
	private readonly preferences: SkillPreferenceStore;
	private readonly loader: SkillLoader;
	private readonly safetyPolicy: SkillSafetyPolicy;
	private readonly auditLog: SkillAuditLog;
	private readonly ranker: SkillRanker;
	private readonly discovery: SkillDiscovery;
	private readonly selector: SkillSelector;
	private readonly planner: SkillPlanner;
	private readonly engine: SkillExecutionEngine;
	private readonly dependencyResolver: SkillDependencyResolver;
	private readonly userDataDirectory?: UserDataDirectoryServicePort;

	constructor(
		private readonly logger: LoggerService,
		options: SkillsServiceOptions = {}
	) {
		this.registry = options.registry ?? new SkillRegistry();
		this.preferences = options.preferences ?? new InMemorySkillPreferenceStore();
		this.loader = options.loader ?? new SkillLoader();
		this.safetyPolicy = options.safetyPolicy ?? new SkillSafetyPolicy();
		this.auditLog = new SkillAuditLog(logger);
		this.ranker = new SkillRanker();
		this.discovery = new SkillDiscovery(this.registry, this.ranker, this.safetyPolicy);
		this.selector = new SkillSelector();
		this.planner = new SkillPlanner();
		this.engine = new SkillExecutionEngine(this.registry, this.auditLog, this.preferences);
		this.dependencyResolver = new SkillDependencyResolver(this.registry);
		this.userDataDirectory = options.userDataDirectory;

	}

	registerSkill(skill: SkillDefinition): SkillDefinition {
		const registered = this.registry.registerSkill(skill);
		const dependencies = this.dependencyResolver.resolve(registered);
		for (const warning of dependencies.warnings) {
			this.logger.warn('SkillsService', warning);
		}
		if (!dependencies.ok) {
			this.logger.warn('SkillsService', `Skill ${skill.id} has missing dependencies`, {
				missing: dependencies.missing,
			});
		}
		return registered;
	}

	getRegistry(): SkillRegistry {
		return this.registry;
	}

	getSkillsRoot(): string {
		const root = this.userDataDirectory?.resolve('skills') ?? resolveDefaultUserDataPath('skills');
		fs.mkdirSync(root, { recursive: true });
		return root;
	}

	async list(): Promise<SkillInfo[]> {
		await this.registerManagedDynamicSkills();
		const root = this.getSkillsRoot();
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		const skills: SkillInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory() || isIgnoredSkillDirectoryName(entry.name)) continue;

			const id = entry.name;
			const folderPath = path.join(root, id);
			const skill = await this.readSkillInfo(folderPath, id);
			if (skill) {
				skills.push(skill);
			}
		}

		skills.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
		return skills;
	}

	async search(query: string, options: SkillSearchOptions = {}): Promise<SkillSearchResult[]> {
		const terms = query
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(Boolean);
		const names = new Set((options.names ?? []).map((name) => name.toLowerCase()));
		const limit = Math.max(1, Math.min(options.limit ?? 3, 12));

		return (await this.list())
			.map((skill) => {
				const haystack = [
					skill.id,
					skill.name,
					skill.description,
					...(skill.manifest.tags ?? []),
					skill.manifest.category ?? '',
				]
					.join(' ')
					.toLowerCase();
				const configuredBoost = names.has(skill.id.toLowerCase()) || names.has(skill.name.toLowerCase()) ? 20 : 0;
				const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 10 : 0), configuredBoost);
				return score > 0
					? {
							id: skill.id,
							name: skill.name,
							description: skill.description,
							score,
							reason: configuredBoost > 0 ? 'configured skill match' : 'matched skill metadata',
						}
					: null;
			})
			.filter((result): result is SkillSearchResult => result !== null)
			.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
			.slice(0, limit);
	}

	async load(name: string): Promise<SkillDetails> {
		const id = toSkillId(name);
		const skill = (await this.list()).find(
			(candidate) => candidate.id === id || candidate.name.toLowerCase() === name.trim().toLowerCase()
		);
		if (!skill) throw new Error(`Skill not found: ${name}`);
		const loaded = await this.loader.loadPackage(skill.folderPath, { trusted: true });
		return {
			...skill,
			frontmatter: {
				name: loaded.manifest.name,
				description: loaded.manifest.description ?? '',
				license: loaded.manifest.license,
				compatibility: loaded.manifest.compatibility,
				metadata: loaded.manifest.metadata,
				allowedTools: loaded.manifest.allowedTools,
			},
			instructions: await fs.promises.readFile(loaded.skillPath, 'utf8'),
			supportFiles: [],
		};
	}

	async discoverForPrompt(
		query: string,
		input: SkillRuntimeInput
	): Promise<SkillPromptChoice[]> {
		await this.registerManagedDynamicSkills();
		const userPreferences = await this.preferences.getPreferences(input.userId);
		const priorSuccess = new Map<string, number>();
		for (const skill of this.registry.listSkills()) {
			const rate = await this.preferences.getSuccessRate(input.userId, skill.id);
			if (rate !== undefined) priorSuccess.set(skill.id, rate);
		}

		const context = await this.createExecutionContext(input, userPreferences);
		const discoveryContext = makeDiscoveryContext({
			userId: input.userId,
			sessionId: input.sessionId,
			availableTools: input.tools.map((tool) => tool.name),
			availableConnectors: input.connectors?.map((connector) => connector.id) ?? [],
			permissions: Array.from(context.permissions),
			availableMemoryKinds: ['preferences', 'episodic', 'semantic', 'project', 'workflow'],
			userPreferences,
			priorSuccessRate: priorSuccess,
		});
		const discovery = await this.discovery.discover(query, discoveryContext, context, {
			maxResults: 8,
		});
		const decision = this.selector.select(discovery);
		const plan = this.planner.createPlan(query, decision);
		context.currentPlan = plan;

		return discovery.candidates.map(({ skill, ranking }) => ({
			id: skill.id,
			version: skill.version,
			name: skill.name,
			description: skill.description,
			category: skill.category,
			tags: skill.tags,
			requiredTools: skill.requiredTools,
			allowedTools: skill.contract.allowedTools,
			requiredConnectors: skill.requiredConnectors,
			permissionsRequired: skill.permissionsRequired,
			safetyLevel: skill.safetyLevel,
			path: typeof skill.metadata.skillPath === 'string' ? skill.metadata.skillPath : undefined,
			score: ranking.score,
		}));
	}

	createExecutionTool(input: Omit<SkillRuntimeInput, 'toolContext'>): SkillTool {
		return {
			name: 'execute_skill',
			description:
				'Execute one registered high-level skill by id. Skills run with scoped tools, connectors, permissions, memory policy, safety checks, and provenance.',
			schema: {
				type: 'object',
				properties: {
					skillId: { type: 'string' },
					version: { type: 'string' },
					input: { type: 'object', additionalProperties: true },
					timeoutMs: {
						type: 'number',
						description:
							'Skill execution timeout in milliseconds. Set to 0 to disable the timeout.',
					},
					noTimeout: {
						type: 'boolean',
						description: 'Disable the skill execution timeout for this invocation.',
					},
				},
				required: ['skillId'],
				additionalProperties: true,
			},
			execute: async (args, toolContext) => {
				const parsedSkill = splitSkillIdAndVersion(
					getSkillToolString(args, 'skillId') ?? '',
					getSkillToolString(args, 'version')
				);
				const skillId = parsedSkill.skillId;
				const version = parsedSkill.version;
				if (!skillId) return textResult('execute_skill: skillId is required', true);

				const userPreferences = await this.preferences.getPreferences(input.userId);
				const context = await this.createExecutionContext(
					{ ...input, toolContext },
					userPreferences
				);
				const timeoutMs = normalizeSkillExecutionTimeout(args);
				if (timeoutMs !== undefined) context.timeoutMs = timeoutMs;
				const result = await this.engine.execute({
					skillId,
					version,
					input: normalizeSkillToolInput(args),
					context,
				});
				const payload = {
					success: result.success,
					data: result.data,
					error: result.error,
					warnings: result.warnings,
					provenance: result.provenance,
					usedSkills: result.usedSkills,
					usedTools: result.usedTools,
					usedConnectors: result.usedConnectors,
				};
				return {
					...textResult(JSON.stringify(payload, null, 2), !result.success),
					details: result,
				};
			},
		};
	}

	async importFromPath(sourceDir: string): Promise<SkillImportResult> {
		const source = path.resolve(sourceDir);
		const stat = await fs.promises.stat(source);
		if (!stat.isDirectory()) {
			throw new Error('Select a skill folder.');
		}

		const discovery = await this.loader.loadPackages(source, { trusted: true });
		const imported: SkillInfo[] = [];
		const skipped = [...discovery.skipped];

		for (const loaded of discovery.packages) {
			const id = toSkillId(
				loaded.manifest.id ?? loaded.manifest.name ?? path.basename(loaded.sourcePath)
			);
			const target = this.resolveSkillDir(id);

			if (loaded.sourcePath === target) {
				skipped.push({
					name: id,
					sourcePath: loaded.sourcePath,
					reason: 'This skill is already managed by Friday.',
				});
				continue;
			}

			try {
				await fs.promises.cp(loaded.sourcePath, target, {
					recursive: true,
					errorOnExist: true,
					force: false,
					filter: (sourcePath) => shouldCopySkillPath(loaded.sourcePath, sourcePath),
				});
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === 'ERR_FS_CP_EEXIST') {
					skipped.push({
						name: id,
						sourcePath: loaded.sourcePath,
						reason: `Skill already exists: ${id}`,
					});
					continue;
				}
				throw error;
			}

			const skill = await this.readSkillInfo(target, id);
			if (!skill) {
				await fs.promises.rm(target, { recursive: true, force: true });
				skipped.push({
					name: id,
					sourcePath: loaded.sourcePath,
					reason: 'Imported folder is missing SKILL.md.',
				});
				continue;
			}

			this.logger.info('SkillsService', `Imported skill folder: ${id}`);
			await this.registerDynamicSkill(target);
			imported.push(skill);
		}

		if (imported.length === 0 && skipped.length > 0) {
			throw new Error(skipped.map((item) => `${item.name}: ${item.reason}`).join('; '));
		}

		return { imported, skipped };
	}

	async delete(id: string): Promise<void> {
		const folderPath = this.resolveSkillDir(id);
		const skill = await this.readSkillInfo(folderPath, id);
		await fs.promises.rm(folderPath, { recursive: true, force: true });
		if (skill?.manifest.id && skill.manifest.id !== id) {
			this.registry.unregisterSkill(skill.manifest.id);
		}
		this.registry.unregisterSkill(id);
		this.logger.info('SkillsService', `Deleted skill folder: ${id}`);
	}

	async downloadToPath(id: string, destinationRoot: string): Promise<SkillDownloadResult> {
		const source = this.resolveSkillDir(id);
		const skill = await this.readSkillInfo(source, id);
		if (!skill) {
			throw new Error(`Skill not found: ${id}`);
		}

		const destinationStat = await fs.promises.stat(destinationRoot);
		if (!destinationStat.isDirectory()) {
			throw new Error('Select a destination folder.');
		}

		const [sourceRealPath, destinationRealPath] = await Promise.all([
			fs.promises.realpath(source),
			fs.promises.realpath(destinationRoot),
		]);
		if (isPathInside(sourceRealPath, destinationRealPath)) {
			throw new Error('Destination folder cannot be inside the skill folder.');
		}

		const destinationPath = path.join(destinationRealPath, skill.id);
		if (await pathExists(destinationPath)) {
			throw new Error(`Destination already exists: ${destinationPath}`);
		}

		await fs.promises.cp(sourceRealPath, destinationPath, {
			recursive: true,
			errorOnExist: true,
			force: false,
			filter: (sourcePath) => shouldCopySkillPath(sourceRealPath, sourcePath),
		});
		this.logger.info('SkillsService', `Downloaded skill folder: ${id}`, { destinationPath });
		return { id: skill.id, destinationPath };
	}

	private resolveSkillDir(id: string): string {
		if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) {
			throw new Error(`Invalid skill id: ${id}`);
		}

		const root = path.resolve(this.getSkillsRoot());
		const folderPath = path.resolve(path.join(root, id));
		if (path.dirname(folderPath) !== root) {
			throw new Error(`Skill id escapes skills root: ${id}`);
		}

		return folderPath;
	}

	private async readSkillInfo(folderPath: string, id: string): Promise<SkillInfo | null> {
		try {
			const loaded = await this.loader.loadPackage(folderPath, { trusted: true });
			return this.toSkillInfo(loaded, id, folderPath);
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (code !== 'ENOENT') {
				this.logger.warn('SkillsService', `Skipping ${id}: cannot read SKILL.md`, {
					error: (error as Error).message,
				});
			}
			return null;
		}
	}

	private toSkillInfo(loaded: SkillPackage, id: string, folderPath: string): SkillInfo {
		return {
			id,
			name: loaded.manifest.name,
			description: loaded.manifest.description ?? '',
			location: folderPath,
			folderPath,
			skillPath: loaded.skillPath,
			manifest: loaded.manifest,
			diagnostics: loaded.diagnostics,
			structure: loaded.structure,
		};
	}

	private async registerDynamicSkill(folderPath: string): Promise<void> {
		const loaded = await this.loader.loadPackage(folderPath, { trusted: true });
		const existingVersions = this.registry.getSkillVersions(loaded.skill.id);
		const conflictsWithBuiltIn = existingVersions.some((skill) => skill.metadata.dynamic !== true);
		if (conflictsWithBuiltIn) {
			this.logger.warn(
				'SkillsService',
				`Skipping ${loaded.skill.id}: conflicts with a built-in skill`
			);
			return;
		}
		if (existingVersions.length > 0) {
			this.registry.unregisterSkill(loaded.skill.id);
		}
		this.registerSkill(loaded.skill);
	}

	private async registerManagedDynamicSkills(): Promise<void> {
		const root = this.getSkillsRoot();
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			if (!entry.isDirectory() || isIgnoredSkillDirectoryName(entry.name)) continue;
			const folderPath = path.join(root, entry.name);
			try {
				await this.registerDynamicSkill(folderPath);
			} catch (error) {
				this.logger.warn('SkillsService', `Skipping ${entry.name}: cannot register skill`, {
					error: (error as Error).message,
				});
			}
		}
	}

	private async createExecutionContext(
		input: SkillRuntimeInput,
		userPreferences?: SkillUserPreferences
	): Promise<SkillExecutionRequestContext> {
		const preferences = userPreferences ?? (await this.preferences.getPreferences(input.userId));
		const allowedTools = new Map(input.tools.map((tool) => [tool.name, tool] as const));
		const allowedConnectors = new Map(
			(input.connectors ?? []).map((connector) => [connector.id, connector] as const)
		);
		const permissions = new Set<string>([
			'skill.execute',
			'memory:read:preferences',
			...input.tools.map((tool) => `tool:${tool.name}`),
			...(input.connectors ?? []).map((connector) => `connector:${connector.id}`),
			...(input.permissions ?? []),
		]);

		return {
			userId: input.userId,
			sessionId: input.sessionId,
			allowedTools,
			allowedConnectors,
			permissions,
			memory: input.memory ?? new NoopSkillMemoryRetriever(this.preferences),
			memoryPolicy: input.memoryPolicy ?? new DefaultSkillMemoryPolicy(),
			userPreferences: preferences,
			cancellationToken: input.signal,
			logger: this.logger,
			safetyPolicy: this.safetyPolicy,
			skillDepth: 0,
			provenanceChain: [],
			toolContext: input.toolContext,
			maxDepth: 4,
			maxRetries: 1,
		};
	}
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.promises.access(filePath);
		return true;
	} catch {
		return false;
	}
}
