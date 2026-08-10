import type { SkillLoadResult } from '../../../shared/skills_types';
import { activateSkill } from './skills_activate';
import { createSkillRegistrySnapshot } from './skills_registry';

export async function loadSkill(name: string): Promise<SkillLoadResult | undefined> {
	const snapshot = createSkillRegistrySnapshot();
	const wanted = name.trim().toLowerCase();
	if (!snapshot.skills.some((skill) => skill.name.toLowerCase() === wanted || skill.id.toLowerCase() === wanted)) return undefined;
	return activateSkill(snapshot, name);
}
