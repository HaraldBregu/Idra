import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SkillManifest } from '../../shared/skills';
import type { SkillDefinition, SkillExecutionContext, SkillResult } from './types';

export interface SkillPackage {
	manifest: SkillManifest;
	skill: SkillDefinition;
	sourcePath: string;
	trusted: boolean;
}

function toSkillId(value: string): string {
	const id = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
	if (!id) throw new Error('Skill id must contain letters or numbers.');
	return id;
}

function stripQuotes(value: string): string {
	const trimmed = value.trim();
	const quote = trimmed[0];
	return (quote === '"' || quote === "'") && trimmed.endsWith(quote)
		? trimmed.slice(1, -1)
		: trimmed;
}

function parseScalar(value: string): unknown {
	const trimmed = stripQuotes(value);
	if (trimmed === 'true') return true;
	if (trimmed === 'false') return false;
	if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
	if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
		return trimmed
			.slice(1, -1)
			.split(',')
			.map((part) => stripQuotes(part.trim()))
			.filter(Boolean);
	}
	return trimmed;
}

function parseFrontMatter(raw: string): Partial<SkillManifest> {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};
	const manifest: Record<string, unknown> = {};
	for (const line of match[1].split(/\r?\n/)) {
		const separator = line.indexOf(':');
		if (separator <= 0) continue;
		manifest[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
	}
	return manifest as Partial<SkillManifest>;
}

function normalizeManifest(raw: Partial<SkillManifest>, fallbackName: string, trusted: boolean): SkillManifest {
	if (!raw.name && !fallbackName) throw new Error('Skill manifest requires a name.');
	const id = toSkillId(raw.id ?? fallbackName);
	const name = raw.name?.trim() || fallbackName;
	return {
		id,
		name,
		description: raw.description,
		category: raw.category ?? 'workflow',
		tags: raw.tags ?? [],
		version: raw.version ?? '0.1.0',
		author: raw.author ?? 'unknown',
		enabled: trusted ? (raw.enabled ?? true) : false,
		visibility: raw.visibility ?? 'private',
		safetyLevel: raw.safetyLevel ?? 'medium',
		permissionsRequired: raw.permissionsRequired ?? [],
		requiredTools: raw.requiredTools ?? [],
		requiredConnectors: raw.requiredConnectors ?? [],
		requiredMemoryKinds: raw.requiredMemoryKinds ?? [],
		inputSchema: raw.inputSchema ?? { type: 'object' },
		outputSchema: raw.outputSchema ?? { type: 'object' },
		estimatedCost: raw.estimatedCost ?? 1,
		estimatedLatency: raw.estimatedLatency ?? 1000,
		reliabilityScore: raw.reliabilityScore ?? 0.5,
		examples: raw.examples ?? [],
		dependencies: raw.dependencies ?? [],
		deprecated: raw.deprecated ?? false,
		metadata: { ...(raw.metadata ?? {}), dynamic: true },
	};
}

function manifestOnlySkill(manifest: SkillManifest, sourcePath: string, trusted: boolean): SkillDefinition {
	const id = manifest.id ?? toSkillId(manifest.name);
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
		outputSchema: manifest.outputSchema ?? { type: 'object' },
		estimatedCost: { amount: manifest.estimatedCost ?? 1, unit: 'abstract' },
		estimatedLatency: { p50Ms: manifest.estimatedLatency ?? 1000 },
		reliabilityScore: manifest.reliabilityScore ?? 0.5,
		examples: manifest.examples ?? [],
		dependencies: manifest.dependencies ?? [],
		deprecated: manifest.deprecated,
		metadata: manifest.metadata ?? {},
		trusted,
		loadedFrom: sourcePath,
		contract: {
			inputs: manifest.inputSchema ?? { type: 'object' },
			outputs: manifest.outputSchema ?? { type: 'object' },
			sideEffects: [],
			permissionsRequired: manifest.permissionsRequired ?? [],
			allowedTools: manifest.requiredTools ?? [],
			allowedConnectors: manifest.requiredConnectors ?? [],
			memoryAccess: (manifest.requiredMemoryKinds ?? []).map((kind) => ({
				kind,
				access: 'read' as const,
				purpose: 'Manifest-declared memory dependency',
			})),
			failureBehavior: ['Return unavailable until a trusted implementation is installed.'],
		},
		async canHandle() {
			return {
				canHandle: false,
				confidence: 0,
				reasons: ['Manifest-only dynamic skill has no trusted runtime implementation.'],
			};
		},
		async execute(_input: unknown, context: SkillExecutionContext): Promise<SkillResult> {
			return context.fail({
				code: 'unavailable',
				message: `Skill package ${id} has no trusted executable implementation.`,
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
		const jsonPath = path.join(sourcePath, 'skill.json');
		const mdPath = path.join(sourcePath, 'SKILL.md');
		let rawManifest: Partial<SkillManifest>;

		try {
			rawManifest = JSON.parse(await fs.readFile(jsonPath, 'utf8')) as Partial<SkillManifest>;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			const raw = await fs.readFile(mdPath, 'utf8');
			rawManifest = parseFrontMatter(raw);
		}

		const manifest = normalizeManifest(rawManifest, path.basename(sourcePath), trusted);
		const skill = manifestOnlySkill(manifest, sourcePath, trusted);
		return { manifest, skill, sourcePath, trusted };
	}
}
