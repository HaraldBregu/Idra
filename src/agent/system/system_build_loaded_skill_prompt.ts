import type { LoadedSkill } from '../context';
import { addSkillPrompt } from './system_add_skill_prompt';

export function buildLoadedSkillPrompt(loadedSkills: LoadedSkill[]): string {
	return loadedSkills.length === 0 ? '' : addSkillPrompt('', loadedSkills, false).trim();
}
