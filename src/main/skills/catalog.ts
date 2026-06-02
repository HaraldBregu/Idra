import type { SkillCategory } from '../../shared/skills';
import type { SkillDefinition } from './types';

function versionParts(version: string): number[] {
	return version
		.split(/[+-]/)[0]
		.split('.')
		.map((part) => Number.parseInt(part, 10))
		.map((part) => (Number.isFinite(part) ? part : 0));
}

export function compareSkillVersions(a: string, b: string): number {
	const left = versionParts(a);
	const right = versionParts(b);
	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index++) {
		const diff = (left[index] ?? 0) - (right[index] ?? 0);
		if (diff !== 0) return diff;
	}
	return a.localeCompare(b);
}

export class SkillVersionManager {
	latest<TSkill extends Pick<SkillDefinition, 'version'>>(skills: TSkill[]): TSkill | undefined {
		return [...skills].sort((a, b) => compareSkillVersions(b.version, a.version))[0];
	}

	satisfies(version: string, range?: string): boolean {
		const trimmed = range?.trim();
		if (!trimmed || trimmed === '*') return true;
		if (trimmed === version) return true;

		if (trimmed.startsWith('>=')) {
			return compareSkillVersions(version, trimmed.slice(2).trim()) >= 0;
		}

		if (trimmed.startsWith('^')) {
			const base = trimmed.slice(1).trim();
			const [major] = versionParts(base);
			return versionParts(version)[0] === major && compareSkillVersions(version, base) >= 0;
		}

		if (trimmed.startsWith('~')) {
			const base = trimmed.slice(1).trim();
			const [major, minor] = versionParts(base);
			const [actualMajor, actualMinor] = versionParts(version);
			return actualMajor === major && actualMinor === minor && compareSkillVersions(version, base) >= 0;
		}

		if (trimmed.endsWith('.x') || trimmed.endsWith('.*')) {
			const wanted = trimmed.slice(0, -2).split('.');
			const actual = version.split('.');
			return wanted.every((part, index) => actual[index] === part);
		}

		return false;
	}

	compatible<TSkill extends Pick<SkillDefinition, 'version'>>(
		skills: TSkill[],
		range?: string
	): TSkill | undefined {
		return this.latest(skills.filter((skill) => this.satisfies(skill.version, range)));
	}
}

function normalizeSkillId(id: string): string {
	const normalized = id.trim().toLowerCase();
	if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
		throw new Error(`Invalid skill id: ${id}`);
	}
	return normalized;
}

function searchableText(skill: SkillDefinition): string {
	return [
		skill.id,
		skill.name,
		skill.description,
		skill.category,
		...skill.tags,
		...skill.examples.map((example) => example.description ?? ''),
	]
		.join(' ')
		.toLowerCase();
}

export class SkillRegistry {
	private readonly skills = new Map<string, Map<string, SkillDefinition>>();
	private readonly versions = new SkillVersionManager();

	registerSkill<TInput, TOutput>(skill: SkillDefinition<TInput, TOutput>): SkillDefinition<TInput, TOutput> {
		const id = normalizeSkillId(skill.id);
		const version = skill.version.trim();
		if (!version) throw new Error(`Skill version is required: ${id}`);

		const byVersion = this.skills.get(id) ?? new Map<string, SkillDefinition>();
		if (byVersion.has(version)) {
			throw new Error(`Skill already registered: ${id}@${version}`);
		}

		const registered = { ...skill, id };
		byVersion.set(version, registered as SkillDefinition);
		this.skills.set(id, byVersion);
		return registered;
	}

	unregisterSkill(skillId: string): void {
		this.skills.delete(normalizeSkillId(skillId));
	}

	getSkill<TInput = unknown, TOutput = unknown>(
		skillId: string,
		version?: string
	): SkillDefinition<TInput, TOutput> | undefined {
		const byVersion = this.skills.get(normalizeSkillId(skillId));
		if (!byVersion) return undefined;
		const skill = version
			? byVersion.get(version)
			: this.versions.latest(Array.from(byVersion.values()));
		return skill as SkillDefinition<TInput, TOutput> | undefined;
	}

	listSkills(options: { includeDisabled?: boolean } = {}): SkillDefinition[] {
		const all = Array.from(this.skills.values()).flatMap((versions) => Array.from(versions.values()));
		return options.includeDisabled ? all : all.filter((skill) => skill.enabled);
	}

	searchSkills(query: string, options: { includeDisabled?: boolean; limit?: number } = {}): SkillDefinition[] {
		const terms = query
			.toLowerCase()
			.split(/[^a-z0-9._-]+/)
			.filter(Boolean);
		const scored = this.listSkills(options)
			.map((skill) => ({
				skill,
				score: terms.reduce((total, term) => total + (searchableText(skill).includes(term) ? 1 : 0), 0),
			}))
			.filter((item) => terms.length === 0 || item.score > 0)
			.sort((a, b) => b.score - a.score || b.skill.reliabilityScore - a.skill.reliabilityScore);
		return scored.slice(0, options.limit ?? scored.length).map((item) => item.skill);
	}

	listSkillsByCategory(category: SkillCategory, options: { includeDisabled?: boolean } = {}): SkillDefinition[] {
		return this.listSkills(options).filter((skill) => skill.category === category);
	}

	enableSkill(skillId: string, version?: string): void {
		this.setEnabled(skillId, true, version);
	}

	disableSkill(skillId: string, version?: string): void {
		this.setEnabled(skillId, false, version);
	}

	getSkillVersions(skillId: string): SkillDefinition[] {
		const byVersion = this.skills.get(normalizeSkillId(skillId));
		if (!byVersion) return [];
		return Array.from(byVersion.values()).sort((a, b) => this.compareVersions(b.version, a.version));
	}

	private setEnabled(skillId: string, enabled: boolean, version?: string): void {
		const byVersion = this.skills.get(normalizeSkillId(skillId));
		if (!byVersion) throw new Error(`Skill not found: ${skillId}`);
		const targets = version ? [byVersion.get(version)] : Array.from(byVersion.values());
		for (const skill of targets) {
			if (!skill) throw new Error(`Skill version not found: ${skillId}@${version}`);
			skill.enabled = enabled;
		}
	}

	private compareVersions(a: string, b: string): number {
		const left = this.versions.latest([{ version: a }, { version: b }]);
		return left?.version === a ? 1 : -1;
	}
}

export interface SkillDependencyResolution {
	ok: boolean;
	missing: string[];
	warnings: string[];
}

export class SkillDependencyResolver {
	private readonly versions = new SkillVersionManager();

	constructor(private readonly registry: SkillRegistry) {}

	resolve(skill: SkillDefinition): SkillDependencyResolution {
		const missing: string[] = [];
		const warnings: string[] = [];

		for (const dependency of skill.dependencies) {
			const versions = this.registry.getSkillVersions(dependency.id);
			const compatible = this.versions.compatible(versions, dependency.version);
			if (!compatible && !dependency.optional) {
				missing.push(`${dependency.id}${dependency.version ? `@${dependency.version}` : ''}`);
			}
			if (!compatible && dependency.optional) {
				warnings.push(`Optional skill dependency not available: ${dependency.id}`);
			}
		}

		return { ok: missing.length === 0, missing, warnings };
	}
}
