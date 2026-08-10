import type { SkillInfo } from '../../../shared/skills_types';
import { readSkill } from './skills_read';
import { resolveSkillFolder } from './skills_resolve_folder';
import { setSkillPolicy } from './skills_policy_set';

export function setEnabled(id: string, enabled: boolean): SkillInfo {
	const folder = resolveSkillFolder(id);
	const info = readSkill(folder, id);
	if (!info) throw new Error(`Skill "${id}" not found.`);
	setSkillPolicy(id, {
		enabled,
		...(enabled ? { trusted: true, reviewedHash: info.hash } : {}),
	});
	const updated = readSkill(folder, id);
	if (!updated) throw new Error(`Skill "${id}" could not be reloaded.`);
	return updated;
}
