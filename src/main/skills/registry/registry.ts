import type { SkillCategory } from '../../../shared/skills';
import type { SkillDefinition } from '../core/types';
import { SkillVersionManager } from './version-manager';

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
