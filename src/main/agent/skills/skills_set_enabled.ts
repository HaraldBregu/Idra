import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillInfo } from '../../../shared/skills_types';
import { readSkill, SKILL_FILE } from './skills_read';
import { resolveSkillFolder } from './skills_resolve_folder';

export function setEnabled(id: string, enabled: boolean): SkillInfo {
	const folder = resolveSkillFolder(id);
	const info = readSkill(folder, id);
	if (!info) throw new Error(`Skill "${id}" not found.`);
	const skillPath = path.join(folder, SKILL_FILE);
	const parsed = matter(fs.readFileSync(skillPath, 'utf8'));
	fs.writeFileSync(skillPath, matter.stringify(parsed.content, { ...parsed.data, enabled }));
	return { ...info, manifest: { ...info.manifest, enabled } };
}
