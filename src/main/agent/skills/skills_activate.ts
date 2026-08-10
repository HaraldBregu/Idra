import type { SkillLoadResult, SkillRegistrySnapshot } from '../../../shared/skills_types';
import { inspectSkill } from './skills_inspect';

export async function activateSkill(snapshot: SkillRegistrySnapshot, name: string): Promise<SkillLoadResult> {
	const wanted = name.trim().toLowerCase();
	const skill = snapshot.skills.find(
		(entry) => entry.name.toLowerCase() === wanted || entry.id.toLowerCase() === wanted
	);
	if (!skill) throw new Error(`Skill "${name}" was not found in this run's registry.`);
	if (!skill.enabled) throw new Error(`Skill "${skill.name}" is disabled.`);
	if (skill.trust !== 'user-controlled') throw new Error(`Skill "${skill.name}" has not been reviewed.`);
	return inspectSkill(snapshot, name);
}
