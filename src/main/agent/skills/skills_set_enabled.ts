import type { SkillInfo } from '../../../shared/skills.types';
import { setSkill } from './skills_store';
import { readSkill } from './skills_read';
import { resolveSkillFolder } from './skills_resolve_folder';

export function setEnabled(id: string, enabled: boolean): SkillInfo {
	const folder = resolveSkillFolder(id);
	const info = readSkill(folder, id);
	if (!info) throw new Error(`Skill "${id}" not found.`);
	setSkill(id, { enabled });
	return { ...info, manifest: { ...info.manifest, enabled } };
}
