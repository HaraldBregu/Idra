import fs from 'node:fs';
import { readSkill } from './skills_read';
import { resolveSkillFolder } from './skills_resolve_folder';
import type { SkillDeleteResult } from '../../../shared/skills_types';

export function deleteSkill(id: string): SkillDeleteResult {
	const folder = resolveSkillFolder(id);
	const name = readSkill(folder, id)?.name ?? id;
	fs.rmSync(folder, { recursive: true, force: true });
	return { id, name, deleted: true };
}
