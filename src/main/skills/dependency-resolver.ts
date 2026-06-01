import type { SkillDefinition } from './types';
import type { SkillRegistry } from './registry';
import { SkillVersionManager } from './version-manager';

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
