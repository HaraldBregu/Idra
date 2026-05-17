import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillManifest } from '../../shared/skills';
import type { SkillDefinition, SkillExecutionContext, SkillResult } from './types';

const MAX_SKILL_FILES = 500;
const MAX_SKILL_FILE_BYTES = 25 * 1024 * 1024;
const MAX_LISTED_RESOURCES = 100;
const RESOURCE_DIRS = ['scripts', 'references', 'assets'] as const;

export interface SkillPackage {
	manifest: SkillManifest;
	skill: SkillDefinition;
	sourcePath: string;
	skillPath: string;
	trusted: boolean;
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
}

interface ParsedSkillMarkdown {
	manifest: SkillManifest;
	instructions: string;
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

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function metadataRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function validateAgentSkillName(name: string, parentDirectoryName: string): void {
	if (name.length < 1 || name.length > 64) {
		throw new Error('Skill name must be 1-64 characters.');
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
		throw new Error('Skill name must use lowercase letters, numbers, and single hyphens only.');
	}
	if (name !== parentDirectoryName) {
		throw new Error(`Skill name must match parent folder name: ${parentDirectoryName}`);
	}
}

function parseSkillMarkdown(raw: string, parentDirectoryName: string, trusted: boolean): ParsedSkillMarkdown {
	if (!/^---\r?\n/.test(raw)) {
		throw new Error('SKILL.md must start with YAML front matter.');
	}

	const parsed = matter(raw);
	const data = parsed.data as AgentSkillFrontMatter;
	const name = asString(data.name);
	const description = asString(data.description);
	if (!name) throw new Error('Skill front matter requires a non-empty name.');
	if (!description) throw new Error('Skill front matter requires a non-empty description.');
	if (description.length > 1024) throw new Error('Skill description must be 1024 characters or less.');
	validateAgentSkillName(name, parentDirectoryName);

	const metadata = metadataRecord(data.metadata);
	const version = asString(data.version) ?? asString(metadata.version) ?? '0.1.0';
	const author = asString(data.author) ?? asString(metadata.author) ?? 'unknown';
	const allowedTools = asStringArray(data['allowed-tools'] ?? data.allowedTools);
	const requiredTools = asStringArray(data.requiredTools) ?? [];
	const requiredConnectors = asStringArray(data.requiredConnectors) ?? [];
	const requiredMemoryKinds = asStringArray(data.requiredMemoryKinds) ?? [];
	const inputSchema = isRecord(data.inputSchema) ? data.inputSchema : { type: 'object' };
	const outputSchema = isRecord(data.outputSchema) ? data.outputSchema : { type: 'object' };

	return {
		manifest: {
			id: name,
			name,
			description,
			license: asString(data.license),
			compatibility: asString(data.compatibility),
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
			metadata: { ...metadata, dynamic: true, source: 'agent-skill' },
		},
		instructions: parsed.content.trim(),
	};
}

async function validateSkillBundle(sourcePath: string): Promise<string> {
	const skillPaths: string[] = [];
	let fileCount = 0;

	async function walk(directory: string): Promise<void> {
		const entries = await fs.readdir(directory, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name);
			const stat = await fs.lstat(fullPath);
			if (stat.isSymbolicLink()) {
				throw new Error('Skill bundles cannot contain symbolic links.');
			}
			if (stat.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (!stat.isFile()) continue;
			fileCount++;
			if (fileCount > MAX_SKILL_FILES) {
				throw new Error(`Skill bundle exceeds ${MAX_SKILL_FILES} files.`);
			}
			if (stat.size > MAX_SKILL_FILE_BYTES) {
				throw new Error(
					`Skill file exceeds ${MAX_SKILL_FILE_BYTES} bytes: ${path.relative(sourcePath, fullPath)}`
				);
			}
			if (entry.name.toLowerCase() === 'skill.md') {
				skillPaths.push(fullPath);
			}
		}
	}

	await walk(sourcePath);
	if (skillPaths.length === 0) throw new Error('Skill package must include SKILL.md.');
	if (skillPaths.length > 1) throw new Error('Skill package must include exactly one SKILL.md file.');

	const skillPath = skillPaths[0]!;
	if (path.dirname(skillPath) !== sourcePath) {
		throw new Error('SKILL.md must be in the skill package root.');
	}
	return skillPath;
}

async function listSkillResources(sourcePath: string): Promise<string[]> {
	const resources: string[] = [];

	async function walk(directory: string): Promise<void> {
		if (resources.length >= MAX_LISTED_RESOURCES) return;
		const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
		for (const entry of entries) {
			if (resources.length >= MAX_LISTED_RESOURCES) return;
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
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
			allowedTools: manifest.requiredTools ?? [],
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
		async execute(_input: unknown, context: SkillExecutionContext): Promise<SkillResult> {
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
	async loadPackage(sourceDir: string, options: { trusted?: boolean } = {}): Promise<SkillPackage> {
		const sourcePath = path.resolve(sourceDir);
		const stat = await fs.stat(sourcePath);
		if (!stat.isDirectory()) throw new Error('Skill package source must be a directory.');

		const trusted = options.trusted ?? false;
		const skillPath = await validateSkillBundle(sourcePath);
		const raw = await fs.readFile(skillPath, 'utf8');
		const parsed = parseSkillMarkdown(raw, path.basename(sourcePath), trusted);
		const manifest = {
			...parsed.manifest,
			metadata: {
				...(parsed.manifest.metadata ?? {}),
				skillPath,
			},
		};
		const skill = manifestOnlySkill(manifest, sourcePath, skillPath, parsed.instructions, trusted);
		return { manifest, skill, sourcePath, skillPath, trusted };
	}
}
