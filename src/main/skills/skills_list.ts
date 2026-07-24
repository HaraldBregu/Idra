import fs from 'node:fs';
import path from 'node:path';
import type { SkillInfo } from '../../shared/skills_types';
import { skillsRoot } from './skills_root';
import { readSkill } from './skills_read';

export function list(): SkillInfo[] {
	if (!fs.existsSync(skillsRoot)) return [];
	const skills: SkillInfo[] = [];
	for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const info = readSkill(path.join(skillsRoot, entry.name), entry.name);
		if (info) skills.push(info);
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name));
}
