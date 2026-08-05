import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillInfo, SkillManifest } from '../../../shared/skills_types';

export const SKILL_FILE = 'SKILL.md';
const RESOURCE_DIRECTORIES = ['scripts', 'references', 'assets'] as const;

export function readSkill(folder: string, id: string): SkillInfo | undefined {
	const skillPath = path.join(folder, SKILL_FILE);
	if (!fs.existsSync(skillPath)) return undefined;
	const fm = matter(fs.readFileSync(skillPath, 'utf8')).data as Partial<SkillManifest>;
	const name = typeof fm.name === 'string' && fm.name.trim() ? fm.name : id;
	const description = typeof fm.description === 'string' ? fm.description : '';
	const manifest: SkillManifest = {
		...fm,
		name,
		description,
		id,
		enabled: fm.enabled !== false,
	};
	return {
		id,
		name,
		description,
		location: folder,
		folderPath: folder,
		skillPath,
		manifest,
		structure: {
			format: 'agent-skill',
			standard: 'agentskills.io',
			kind: 'direct',
			resourceDirectories: RESOURCE_DIRECTORIES.filter((dir) =>
				fs.existsSync(path.join(folder, dir)),
			),
		},
	};
}
