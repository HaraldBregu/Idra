import type { SkillInfo } from '../../../shared/skills.types';
import { setSkill } from './skills-store';
import { readSkill } from './skills-read';
import { resolveSkillFolder } from './skills-resolve-folder';

export function setEnabled(id: string, enabled: boolean): SkillInfo {
	const folder = resolveSkillFolder(id);
	const info = readSkill(folder, id);
	if (!info) throw new Error(`Skill "${id}" not found.`);
	setSkill(id, { enabled });
	return { ...info, manifest: { ...info.manifest, enabled } };
}
