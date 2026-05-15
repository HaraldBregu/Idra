import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { LoggerService } from '../logger';
import type { AgentTool, ToolContext } from '../tools/types';
import { textResult } from '../tools/types';
import type { SkillInfo, SkillManifest } from '../../shared/skills';
import { SkillAuditLog } from './audit-log';
import { SkillDependencyResolver } from './dependency-resolver';
import { SkillDiscovery, makeDiscoveryContext } from './discovery';
import { SkillExecutionEngine } from './execution-engine';
import { createExampleSkills } from './example-skills';
import { SkillLoader } from './loader';
import { DefaultSkillMemoryPolicy, NoopSkillMemoryRetriever } from './memory-policy';
import { InMemorySkillPreferenceStore, type SkillPreferenceStore } from './preferences';
import { SkillPlanner } from './planner';
import { SkillRanker } from './ranker';
import { SkillRegistry } from './registry';
import { SkillSafetyPolicy } from './safety-policy';
import { SkillSelector } from './selector';
import type {
	MemoryPolicy,
	MemoryRetriever,
	SkillConnector,
	SkillDefinition,
	SkillExecutionRequestContext,
	SkillPromptChoice,
	SkillUserPreferences,
} from './types';

function stripYamlString(value: string): string {
	const trimmed = value.trim();
	const quote = trimmed[0];
	if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function parseSkillManifest(raw: string, fallbackName: string): SkillManifest {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	const manifest: Partial<SkillManifest> = {};

	if (match) {
		for (const line of match[1].split(/\r?\n/)) {
			const separator = line.indexOf(':');
			if (separator <= 0) continue;
			const key = line.slice(0, separator).trim();
			const value = stripYamlString(line.slice(separator + 1));
			if (key === 'name' && value) {
				manifest.name = value;
			}
			if (key === 'description' && value) {
				manifest.description = value;
			}
		}
	}

	return {
		name: manifest.name ?? fallbackName,
		description: manifest.description,
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

export interface AgentSkillRuntimeInput {
	userId: string;
	sessionId: string;
	tools: AgentTool[];
	toolContext: ToolContext;
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

		for (const skill of createExampleSkills()) {
			this.registerSkill(skill);
		}
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
		const root = path.join(app.getPath('userData'), 'skills');
		fs.mkdirSync(root, { recursive: true });
		return root;
	}

	async list(): Promise<SkillInfo[]> {
		const root = this.getSkillsRoot();
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		const skills: SkillInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

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

	async discoverForPrompt(query: string, input: AgentSkillRuntimeInput): Promise<SkillPromptChoice[]> {
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
			requiredConnectors: skill.requiredConnectors,
			permissionsRequired: skill.permissionsRequired,
			safetyLevel: skill.safetyLevel,
			score: ranking.score,
		}));
	}

	createExecutionTool(input: Omit<AgentSkillRuntimeInput, 'toolContext'>): AgentTool {
		return {
			name: 'execute_skill',
			description:
				'Execute one registered high-level skill by id. Skills run with scoped tools, connectors, permissions, memory policy, safety checks, and provenance.',
			schema: {
				type: 'object',
				properties: {
					skillId: { type: 'string' },
					version: { type: 'string' },
					input: { type: 'object' },
				},
				required: ['skillId', 'input'],
				additionalProperties: false,
			},
			execute: async (args, toolContext) => {
				const skillId = typeof args.skillId === 'string' ? args.skillId : '';
				const version = typeof args.version === 'string' ? args.version : undefined;
				if (!skillId) return textResult('execute_skill: skillId is required', true);

				const userPreferences = await this.preferences.getPreferences(input.userId);
				const context = await this.createExecutionContext(
					{ ...input, toolContext },
					userPreferences
				);
				const result = await this.engine.execute({
					skillId,
					version,
					input: args.input ?? {},
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

	async importFromPath(sourceDir: string): Promise<SkillInfo> {
		const source = path.resolve(sourceDir);
		const stat = await fs.promises.stat(source);
		if (!stat.isDirectory()) {
			throw new Error('Select a skill folder.');
		}

		const hasSkillMd = await this.exists(path.join(source, 'SKILL.md'));
		const hasSkillJson = await this.exists(path.join(source, 'skill.json'));
		if (!hasSkillMd && !hasSkillJson) {
			throw new Error('Skill package must include SKILL.md or skill.json.');
		}
		await this.loader.loadPackage(source);

		const id = toSkillId(path.basename(source));
		const target = this.resolveSkillDir(id);

		if (source === target) {
			throw new Error('This skill is already managed by Friday.');
		}

		try {
			await fs.promises.cp(source, target, {
				recursive: true,
				errorOnExist: true,
				force: false,
			});
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ERR_FS_CP_EEXIST') {
				throw new Error(`Skill already exists: ${id}`);
			}
			throw error;
		}

		const skill = await this.readSkillInfo(target, id);
		if (!skill) {
			await fs.promises.rm(target, { recursive: true, force: true });
			throw new Error('Imported folder is missing SKILL.md.');
		}

		this.logger.info('SkillsService', `Imported skill folder: ${id}`);
		await this.registerDynamicSkill(target);
		return skill;
	}

	async delete(id: string): Promise<void> {
		const folderPath = this.resolveSkillDir(id);
		await fs.promises.rm(folderPath, { recursive: true, force: true });
		this.logger.info('SkillsService', `Deleted skill folder: ${id}`);
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
		const skillPath = path.join(folderPath, 'SKILL.md');
		try {
			const hasSkillMd = await this.exists(skillPath);
			const hasSkillJson = await this.exists(path.join(folderPath, 'skill.json'));
			if (hasSkillJson) {
				const loaded = await this.loader.loadPackage(folderPath);
				return {
					id,
					folderPath,
					manifest: loaded.manifest,
				};
			}
			const raw = hasSkillMd ? await fs.promises.readFile(skillPath, 'utf8') : '';
			return {
				id,
				folderPath,
				manifest: parseSkillManifest(raw, id),
			};
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

	private async registerDynamicSkill(folderPath: string): Promise<void> {
		const loaded = await this.loader.loadPackage(folderPath);
		const existing = this.registry.getSkill(loaded.skill.id, loaded.skill.version);
		if (!existing) this.registerSkill(loaded.skill);
	}

	private async createExecutionContext(
		input: AgentSkillRuntimeInput,
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

	private async exists(p: string): Promise<boolean> {
		try {
			await fs.promises.access(p, fs.constants.R_OK);
			return true;
		} catch {
			return false;
		}
	}
}
