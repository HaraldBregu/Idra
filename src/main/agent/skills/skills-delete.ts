import fs from 'node:fs';
import { removeSkill } from './skills-store';
import { readSkill } from './skills-read';
import { resolveSkillFolder } from './skills-resolve-folder';
import type { SkillDeleteResult } from '../../../shared/skills.types';

export function deleteSkill(id: string): SkillDeleteResult {
	const folder = resolveSkillFolder(id);
	const name = readSkill(folder, id)?.name ?? id;
	fs.rmSync(folder, { recursive: true, force: true });
	removeSkill(id);
	return { id, name, deleted: true };
}
