import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type {
	SkillDiagnostic,
	SkillImportSkipped,
	SkillManifest,
	SkillStructureInfo,
} from '../../../shared/skills';
import { AGENT_SKILL_RESOURCE_DIRECTORIES } from '../core/provider-support';
import type { SkillDefinition, SkillExecutionContext, SkillResult } from '../core/types';

const MAX_SKILL_FILES = 500;
const MAX_SKILL_DIRECTORIES = 500;
const MAX_SKILL_FILE_BYTES = 256_000;
const MAX_SKILL_BUNDLE_FILE_BYTES = 25 * 1024 * 1024;
const MAX_LISTED_RESOURCES = 100;
const MAX_LISTED_RESOURCE_DIRECTORIES = 100;
const MAX_RESOURCE_DEPTH = 4;
const RESOURCE_DIRS = AGENT_SKILL_RESOURCE_DIRECTORIES;
const SKILL_MARKDOWN_NAME = 'skill.md';
const MAX_SKILL_IMPORT_CANDIDATES = 300;
const IGNORED_SKILL_DIRECTORY_NAMES = new Set([
	'.cache',
	'.git',
	'.hg',
	'.mypy_cache',
	'.pytest_cache',
	'.ruff_cache',
	'.svn',
	'.tox',
	'.venv',
	'__pycache__',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'out',
	'venv',
]);

export interface SkillPackage {
	manifest: SkillManifest;
	skill: SkillDefinition;
	sourcePath: string;
	skillPath: string;
	trusted: boolean;
	diagnostics: SkillDiagnostic[];
	structure: SkillStructureInfo;
}

export interface SkillPackageDiscovery {
	packages: SkillPackage[];
	skipped: SkillImportSkipped[];
}

interface AgentSkillFrontMatter {
	name?: unknown;
	description?: unknown;
	license?: unknown;
	compatibility?: unknown;
	metadata?: unknown;
	'allowed-tools'?: unknown;
	allowedTools?: unknown;
	category?: unknown;
	tags?: unknown;
	version?: unknown;
	author?: unknown;
	enabled?: unknown;
	visibility?: unknown;
	safetyLevel?: unknown;
	permissionsRequired?: unknown;
	requiredTools?: unknown;
	requiredConnectors?: unknown;
	requiredMemoryKinds?: unknown;
	inputSchema?: unknown;
	outputSchema?: unknown;
	estimatedCost?: unknown;
	estimatedLatency?: unknown;
	reliabilityScore?: unknown;
	examples?: unknown;
	dependencies?: unknown;
	deprecated?: unknown;
	'disable-model-invocation'?: unknown;
	disableModelInvocation?: unknown;
	'user-invocable'?: unknown;
	userInvocable?: unknown;
}

interface ParsedSkillMarkdown {
	manifest: SkillManifest;
	instructions: string;
	diagnostics: SkillDiagnostic[];
}

interface AgentSkillActivationOutput {
	name: string;
	description: string;
	path: string;
	directory: string;
	instructions: string;
	resources: string[];
	compatibility?: string;
	allowedTools?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const items = value.map(asString).filter((item): item is string => Boolean(item));
		return items.length > 0 ? items : undefined;
	}
	if (typeof value === 'string') {
		const items = value
			.split(/[,\s]+/)
			.map((item) => item.trim())
			.filter(Boolean);
		return items.length > 0 ? items : undefined;
	}
	return undefined;
}

function normalizeSkillToolName(value: string): string {
	const trimmed = value.trim();
	if (/^bash(?:\(.*\))?$/i.test(trimmed)) return 'exec';
	const key = trimmed.toLowerCase().replace(/[-_\s]/g, '');
	switch (key) {
		case 'read':
		case 'readfile':
			return 'read';
		case 'write':
		case 'writefile':
			return 'write';
		case 'edit':
			return 'edit';
		case 'grep':
		case 'glob':
		case 'find':
			return 'find';
		case 'shell':
		case 'exec':
			return 'exec';
		case 'webfetch':
			return 'web_fetch';
		case 'openbrowser':
			return 'open_browser';
		case 'browser':
			return 'browser';
		default:
			return trimmed;
	}
}

function normalizeSkillToolNames(values: string[] | undefined): string[] | undefined {
	if (!values?.length) return undefined;
	const normalized = values.map(normalizeSkillToolName).filter(Boolean);
	const unique = Array.from(new Set(normalized));
	return unique.length > 0 ? unique : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function asBooleanLike(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return undefined;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;
	return undefined;
}

function metadataRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function skillDiagnostic(
	code: string,
	message: string,
	level: SkillDiagnostic['level'] = 'warning'
): SkillDiagnostic {
	return { level, code, message };
}

function normalizeAgentSkillId(value: string): string {
	const id = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
		.slice(0, 64)
		.replace(/[-._]+$/g, '');

	if (!id) {
		throw new Error('Skill name must contain at least one letter or number.');
	}

	return id;
}

function validateAgentSkillName(name: string): void {
	if (name.length < 1 || name.length > 128) {
		throw new Error('Skill name must be 1-128 characters.');
	}
	if (/[\0\r\n]/.test(name)) {
		throw new Error('Skill name must be a single line without null bytes.');
	}
}

function collectStandardDiagnostics(input: {
	frontmatter: AgentSkillFrontMatter;
	name: string;
	nameProvided: boolean;
	description: string;
	parentDirectoryName: string;
	instructions: string;
}): SkillDiagnostic[] {
	const diagnostics: SkillDiagnostic[] = [];
	if (!input.nameProvided) {
		diagnostics.push(
			skillDiagnostic(
				'name_fallback',
				'Agent Skills standard requires frontmatter.name; Friday used the folder name.'
			)
		);
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.name)) {
		diagnostics.push(
			skillDiagnostic(
				'name_not_standard',
				'Agent Skills standard names should use lowercase letters, numbers, and single hyphens only.'
			)
		);
	}
	if (input.name.length > 64) {
		diagnostics.push(
			skillDiagnostic(
				'name_too_long',
				'Agent Skills standard names should be 64 characters or less.'
			)
		);
	}
	if (input.name !== input.parentDirectoryName) {
		diagnostics.push(
			skillDiagnostic(
				'name_folder_mismatch',
				'Agent Skills standard names should match the parent folder name.'
			)
		);
	}
	if (input.description.length < 40) {
		diagnostics.push(
			skillDiagnostic(
				'description_short',
				'Description should include what the skill does and when to use it.'
			)
		);
	}
	if (typeof input.frontmatter.metadata !== 'undefined') {
		if (!isRecord(input.frontmatter.metadata)) {
			diagnostics.push(skillDiagnostic('metadata_not_map', 'metadata should be a key-value mapping.'));
		} else {
			for (const [key, value] of Object.entries(input.frontmatter.metadata)) {
				if (typeof value !== 'string') {
					diagnostics.push(
						skillDiagnostic(
							'metadata_value_not_string',
							`metadata.${key} should be a string for maximum Agent Skills compatibility.`
						)
					);
				}
			}
		}
	}
	if (Array.isArray(input.frontmatter['allowed-tools'] ?? input.frontmatter.allowedTools)) {
		diagnostics.push(
			skillDiagnostic(
				'allowed_tools_array',
				'allowed-tools is normally a space-separated string; Friday also accepts arrays.'
			)
		);
	}
	if (input.instructions.split(/\r?\n/).length > 500) {
		diagnostics.push(
			skillDiagnostic(
				'instructions_long',
				'Keep SKILL.md under 500 lines and move detailed material to references/ when possible.'
			)
		);
	}
	return diagnostics;
}

function parseSkillMarkdown(raw: string, parentDirectoryName: string, trusted: boolean): ParsedSkillMarkdown {
	if (!/^---\r?\n/.test(raw)) {
		throw new Error('SKILL.md must start with YAML front matter.');
	}

	const parsed = matter(raw);
	const data = (isRecord(parsed.data) ? parsed.data : {}) as AgentSkillFrontMatter;
	const parsedContent = parsed.content.trim();
	const parsedName = asString(data.name);
	const name = parsedName ?? parentDirectoryName.trim();
	const description = asString(data.description);
	if (!description) throw new Error('Skill front matter requires a non-empty description.');
	if (!name) throw new Error('Skill front matter requires a non-empty name.');
	validateAgentSkillName(name);
	if (description.length > 1024) throw new Error('Skill description must be 1024 characters or less.');
	const compatibility = asString(data.compatibility);
	if (compatibility && compatibility.length > 500) {
		throw new Error('Skill compatibility must be 500 characters or less.');
	}
	const id = normalizeAgentSkillId(name);
	const diagnostics = collectStandardDiagnostics({
		frontmatter: data,
		name,
		nameProvided: Boolean(parsedName),
		description,
		parentDirectoryName,
		instructions: parsedContent,
	});

	const metadata = metadataRecord(data.metadata);
	const version = asString(data.version) ?? asString(metadata.version) ?? '0.1.0';
	const author = asString(data.author) ?? asString(metadata.author) ?? 'unknown';
	const allowedTools = normalizeSkillToolNames(asStringArray(data['allowed-tools'] ?? data.allowedTools));
	const requiredTools = normalizeSkillToolNames(asStringArray(data.requiredTools)) ?? [];
	const requiredConnectors = asStringArray(data.requiredConnectors) ?? [];
	const requiredMemoryKinds = asStringArray(data.requiredMemoryKinds) ?? [];
	const inputSchema = isRecord(data.inputSchema) ? data.inputSchema : { type: 'object' };
	const outputSchema = isRecord(data.outputSchema) ? data.outputSchema : { type: 'object' };
	const disableModelInvocation =
		asBooleanLike(data['disable-model-invocation'] ?? data.disableModelInvocation) ?? false;
	const userInvocable = asBooleanLike(data['user-invocable'] ?? data.userInvocable) ?? true;

	return {
		manifest: {
			id,
			name,
			description,
			license: asString(data.license),
			compatibility,
			category: (asString(data.category) as SkillManifest['category']) ?? 'workflow',
			tags: asStringArray(data.tags) ?? [],
			version,
			author,
			enabled: trusted ? (asBoolean(data.enabled) ?? true) : false,
			visibility: (asString(data.visibility) as SkillManifest['visibility']) ?? 'private',
			safetyLevel: (asString(data.safetyLevel) as SkillManifest['safetyLevel']) ?? 'medium',
			permissionsRequired: asStringArray(data.permissionsRequired) ?? [],
			requiredTools,
			allowedTools,
			requiredConnectors,
			requiredMemoryKinds,
			inputSchema,
			outputSchema,
			estimatedCost: asNumber(data.estimatedCost) ?? 1,
			estimatedLatency: asNumber(data.estimatedLatency) ?? 1000,
			reliabilityScore: asNumber(data.reliabilityScore) ?? 0.5,
			examples: Array.isArray(data.examples) ? (data.examples as SkillManifest['examples']) : [],
			dependencies: Array.isArray(data.dependencies)
				? (data.dependencies as SkillManifest['dependencies'])
				: [],
			deprecated: asBoolean(data.deprecated) ?? false,
			metadata: {
				...metadata,
				dynamic: true,
				source: 'agent-skill',
				disableModelInvocation,
				userInvocable,
			},
		},
		instructions: parsedContent,
		diagnostics,
	};
}

export function isIgnoredSkillDirectoryName(name: string): boolean {
	return name.startsWith('.') || IGNORED_SKILL_DIRECTORY_NAMES.has(name.toLowerCase());
}

function isPathInside(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

async function listRootSkillFiles(sourcePath: string): Promise<string[]> {
	const entries = await fs.readdir(sourcePath, { withFileTypes: true });
	const skillPaths: string[] = [];
	for (const entry of entries) {
		if (entry.name.toLowerCase() !== SKILL_MARKDOWN_NAME) continue;
		const fullPath = path.join(sourcePath, entry.name);
		const stat = await fs.lstat(fullPath);
		if (!stat.isFile()) continue;
		skillPaths.push(fullPath);
	}
	return skillPaths;
}

async function hasRootSkillFile(sourcePath: string): Promise<boolean> {
	return (await listRootSkillFiles(sourcePath)).length > 0;
}

async function listChildDirectories(sourcePath: string): Promise<string[]> {
	const entries = await fs.readdir(sourcePath, { withFileTypes: true }).catch(() => []);
	return entries
		.filter((entry) => entry.isDirectory() && !isIgnoredSkillDirectoryName(entry.name))
		.map((entry) => path.join(sourcePath, entry.name))
		.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function listContainerSkillDirs(sourcePath: string): Promise<string[]> {
	const candidateRoots = [sourcePath];
	const sourceRealPath = await fs.realpath(sourcePath);
	for (const nestedSkillsRoot of [
		path.join(sourcePath, 'skills'),
		path.join(sourcePath, '.agents', 'skills'),
	]) {
		if (nestedSkillsRoot === sourcePath) continue;
		const nestedStat = await fs.lstat(nestedSkillsRoot).catch(() => undefined);
		if (nestedStat?.isDirectory() && !nestedStat.isSymbolicLink()) {
			const nestedRealPath = await fs.realpath(nestedSkillsRoot);
			if (isPathInside(sourceRealPath, nestedRealPath)) {
				candidateRoots.push(nestedSkillsRoot);
			}
		}
	}

	const seen = new Set<string>();
	const skillDirs: string[] = [];
	async function addCandidate(candidate: string): Promise<void> {
		if (skillDirs.length >= MAX_SKILL_IMPORT_CANDIDATES) return;
		const resolved = path.resolve(candidate);
		if (seen.has(resolved)) return;
		seen.add(resolved);
		const realPath = await fs.realpath(resolved);
		if (!isPathInside(sourceRealPath, realPath)) return;
		if (await hasRootSkillFile(resolved)) {
			skillDirs.push(resolved);
		}
	}

	for (const root of candidateRoots) {
		for (const child of await listChildDirectories(root)) {
			await addCandidate(child);
			if (skillDirs.length >= MAX_SKILL_IMPORT_CANDIDATES) break;
			if (!(await hasRootSkillFile(child))) {
				for (const groupedChild of await listChildDirectories(child)) {
					await addCandidate(groupedChild);
					if (skillDirs.length >= MAX_SKILL_IMPORT_CANDIDATES) break;
				}
			}
		}
	}
	return skillDirs;
}

async function validateSkillBundle(
	sourcePath: string,
	options: { maxSkillFileBytes?: number } = {}
): Promise<string> {
	const sourceStat = await fs.lstat(sourcePath);
	if (sourceStat.isSymbolicLink()) {
		throw new Error('Skill package source cannot be a symbolic link.');
	}

	const rootRealPath = await fs.realpath(sourcePath);

	const skillPaths: string[] = [];
	let fileCount = 0;
	let directoryCount = 0;
	const maxSkillFileBytes = options.maxSkillFileBytes ?? MAX_SKILL_FILE_BYTES;

	async function walk(directory: string): Promise<void> {
		const entries = await fs.readdir(directory, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name);
			const stat = await fs.lstat(fullPath);
			if (stat.isSymbolicLink()) {
				throw new Error('Skill bundles cannot contain symbolic links.');
			}
			const realPath = await fs.realpath(fullPath);
			if (!isPathInside(rootRealPath, realPath)) {
				throw new Error('Skill bundle path resolves outside the skill root.');
			}
			if (stat.isDirectory()) {
				if (isIgnoredSkillDirectoryName(entry.name)) {
					continue;
				}
				directoryCount++;
				if (directoryCount > MAX_SKILL_DIRECTORIES) {
					throw new Error(`Skill bundle exceeds ${MAX_SKILL_DIRECTORIES} directories.`);
				}
				await walk(fullPath);
				continue;
			}
			if (!stat.isFile()) continue;
			fileCount++;
			if (fileCount > MAX_SKILL_FILES) {
				throw new Error(`Skill bundle exceeds ${MAX_SKILL_FILES} files.`);
			}
			if (entry.name.toLowerCase() === SKILL_MARKDOWN_NAME && stat.size > maxSkillFileBytes) {
				throw new Error(
					`SKILL.md exceeds ${maxSkillFileBytes} bytes: ${path.relative(sourcePath, fullPath)}`
				);
			}
			if (stat.size > MAX_SKILL_BUNDLE_FILE_BYTES) {
				throw new Error(
					`Skill file exceeds ${MAX_SKILL_BUNDLE_FILE_BYTES} bytes: ${path.relative(sourcePath, fullPath)}`
				);
			}
			if (entry.name.toLowerCase() === SKILL_MARKDOWN_NAME) {
				skillPaths.push(fullPath);
			}
		}
	}

	const rootSkillPaths = await listRootSkillFiles(sourcePath);
	if (rootSkillPaths.length === 0) throw new Error('Skill package must include SKILL.md.');
	if (rootSkillPaths.length > 1) throw new Error('Skill package must include exactly one SKILL.md file.');

	await walk(sourcePath);
	if (skillPaths.length > 1) throw new Error('Skill package must include exactly one SKILL.md file.');

	const skillPath = rootSkillPaths[0]!;
	if (path.dirname(skillPath) !== sourcePath) {
		throw new Error('SKILL.md must be in the skill package root.');
	}
	return skillPath;
}

async function listSkillResources(sourcePath: string): Promise<string[]> {
	const resources: string[] = [];
	let directoryCount = 0;

	async function walk(directory: string, depth = 0): Promise<void> {
		if (resources.length >= MAX_LISTED_RESOURCES) return;
		if (depth > MAX_RESOURCE_DEPTH) return;
		const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
		for (const entry of entries) {
			if (resources.length >= MAX_LISTED_RESOURCES) return;
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				if (isIgnoredSkillDirectoryName(entry.name)) continue;
				directoryCount++;
				if (directoryCount > MAX_LISTED_RESOURCE_DIRECTORIES) return;
				await walk(fullPath, depth + 1);
			} else if (entry.isFile()) {
				resources.push(path.relative(sourcePath, fullPath).split(path.sep).join('/'));
			}
		}
	}

	for (const directoryName of RESOURCE_DIRS) {
		await walk(path.join(sourcePath, directoryName));
	}
	return resources;
}

async function listPresentResourceDirectories(sourcePath: string): Promise<string[]> {
	const directories: string[] = [];
	for (const directoryName of RESOURCE_DIRS) {
		const stat = await fs.stat(path.join(sourcePath, directoryName)).catch(() => undefined);
		if (stat?.isDirectory()) directories.push(directoryName);
	}
	return directories;
}

function tokenOverlapScore(query: string, skill: SkillManifest): number {
	const queryTokens = new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length > 2));
	const skillText = [skill.name, skill.description, ...(skill.tags ?? [])].join(' ').toLowerCase();
	if (queryTokens.size === 0) return 0;
	let hits = 0;
	for (const token of queryTokens) {
		if (skillText.includes(token)) hits++;
	}
	return hits / queryTokens.size;
}

function manifestOnlySkill(
	manifest: SkillManifest,
	sourcePath: string,
	skillPath: string,
	instructions: string,
	trusted: boolean
): SkillDefinition<unknown, AgentSkillActivationOutput> {
	const id = manifest.id ?? manifest.name;
	return {
		id,
		name: manifest.name,
		description: manifest.description ?? manifest.name,
		category: manifest.category ?? 'workflow',
		tags: manifest.tags ?? [],
		version: manifest.version ?? '0.1.0',
		author: manifest.author ?? 'unknown',
		enabled: manifest.enabled ?? false,
		visibility: manifest.visibility ?? 'private',
		safetyLevel: manifest.safetyLevel ?? 'medium',
		permissionsRequired: manifest.permissionsRequired ?? [],
		requiredTools: manifest.requiredTools ?? [],
		requiredConnectors: manifest.requiredConnectors ?? [],
		requiredMemoryKinds: manifest.requiredMemoryKinds ?? [],
		inputSchema: manifest.inputSchema ?? { type: 'object' },
		outputSchema: {
			type: 'object',
			properties: {
				name: { type: 'string' },
				description: { type: 'string' },
				path: { type: 'string' },
				directory: { type: 'string' },
				instructions: { type: 'string' },
				resources: { type: 'array', items: { type: 'string' } },
				compatibility: { type: 'string' },
				allowedTools: { type: 'array', items: { type: 'string' } },
			},
			required: ['name', 'description', 'path', 'directory', 'instructions', 'resources'],
			additionalProperties: false,
		},
		estimatedCost: { amount: manifest.estimatedCost ?? 1, unit: 'abstract' },
		estimatedLatency: { p50Ms: manifest.estimatedLatency ?? 1000 },
		reliabilityScore: manifest.reliabilityScore ?? 0.5,
		examples: manifest.examples ?? [],
		dependencies: manifest.dependencies ?? [],
		deprecated: manifest.deprecated,
		metadata: {
			...(manifest.metadata ?? {}),
			skillPath,
			instructionChars: instructions.length,
			allowedTools: manifest.allowedTools ?? [],
		},
		trusted,
		loadedFrom: sourcePath,
		contract: {
			inputs: manifest.inputSchema ?? { type: 'object' },
			outputs: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					description: { type: 'string' },
					path: { type: 'string' },
					directory: { type: 'string' },
					instructions: { type: 'string' },
					resources: { type: 'array', items: { type: 'string' } },
				},
				required: ['name', 'description', 'path', 'directory', 'instructions', 'resources'],
				additionalProperties: false,
			},
			sideEffects: ['Loads local Agent Skill instructions into model context.'],
			permissionsRequired: manifest.permissionsRequired ?? [],
			allowedTools: manifest.allowedTools ?? [],
			allowedConnectors: manifest.requiredConnectors ?? [],
			memoryAccess: (manifest.requiredMemoryKinds ?? []).map((kind) => ({
				kind,
				access: 'read' as const,
				purpose: 'Manifest-declared memory dependency',
			})),
			failureBehavior: ['Return a structured activation payload with instructions and resource paths.'],
		},
		async canHandle(context) {
			const confidence = tokenOverlapScore(context.intent, manifest);
			return {
				canHandle: confidence > 0,
				confidence: Math.min(0.85, 0.35 + confidence),
				reasons: confidence > 0 ? ['Matched Agent Skill metadata.'] : [],
			};
		},
		async execute(
			_input: unknown,
			context: SkillExecutionContext
		): Promise<SkillResult<AgentSkillActivationOutput>> {
			const resources = await listSkillResources(sourcePath);
			return context.complete({
				name: manifest.name,
				description: manifest.description ?? manifest.name,
				path: skillPath,
				directory: sourcePath,
				instructions,
				resources,
				...(manifest.compatibility ? { compatibility: manifest.compatibility } : {}),
				...(manifest.allowedTools?.length ? { allowedTools: manifest.allowedTools } : {}),
			});
		},
	};
}

export class SkillLoader {
	async loadPackage(
		sourceDir: string,
		options: {
			trusted?: boolean;
			maxSkillFileBytes?: number;
			structureKind?: SkillStructureInfo['kind'];
		} = {}
	): Promise<SkillPackage> {
		const sourcePath = path.resolve(sourceDir);
		const stat = await fs.stat(sourcePath);
		if (!stat.isDirectory()) throw new Error('Skill package source must be a directory.');

		const trusted = options.trusted ?? false;
		const skillPath = await validateSkillBundle(sourcePath, {
			maxSkillFileBytes: options.maxSkillFileBytes,
		});
		const raw = await fs.readFile(skillPath, 'utf8');
		const parsed = parseSkillMarkdown(raw, path.basename(sourcePath), trusted);
		const structure: SkillStructureInfo = {
			format: 'agent-skill',
			standard: 'agentskills.io',
			kind: options.structureKind ?? 'direct',
			resourceDirectories: await listPresentResourceDirectories(sourcePath),
		};
		const manifest = {
			...parsed.manifest,
			metadata: {
				...(parsed.manifest.metadata ?? {}),
				skillPath,
			},
		};
		const skill = manifestOnlySkill(manifest, sourcePath, skillPath, parsed.instructions, trusted);
		return {
			manifest,
			skill,
			sourcePath,
			skillPath,
			trusted,
			diagnostics: parsed.diagnostics,
			structure,
		};
	}

	async loadPackages(
		sourceDir: string,
		options: { trusted?: boolean; maxSkillFileBytes?: number } = {}
	): Promise<SkillPackageDiscovery> {
		const sourcePath = path.resolve(sourceDir);
		const sourceStat = await fs.lstat(sourcePath);
		if (sourceStat.isSymbolicLink()) {
			throw new Error('Skill package source cannot be a symbolic link.');
		}
		const stat = await fs.stat(sourcePath);
		if (!stat.isDirectory()) throw new Error('Skill package source must be a directory.');

		if (await hasRootSkillFile(sourcePath)) {
			return {
				packages: [
					await this.loadPackage(sourcePath, {
						...options,
						structureKind: 'direct',
					}),
				],
				skipped: [],
			};
		}

		const candidateDirs = await listContainerSkillDirs(sourcePath);
		const packages: SkillPackage[] = [];
		const skipped: SkillImportSkipped[] = [];
		for (const candidateDir of candidateDirs) {
			try {
				packages.push(
					await this.loadPackage(candidateDir, {
						...options,
						structureKind: 'container-child',
					})
				);
			} catch (error) {
				skipped.push({
					name: path.basename(candidateDir),
					sourcePath: candidateDir,
					reason: error instanceof Error ? error.message : 'Unable to load skill.',
				});
			}
		}
		if (packages.length === 0 && skipped.length === 0) {
			throw new Error('Selected folder must contain SKILL.md or skill subfolders with SKILL.md.');
		}
		return { packages, skipped };
	}
}
