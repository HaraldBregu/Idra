import fs from 'node:fs';
import { list } from './skills-list';
import { stripFrontmatter } from './skills-strip-frontmatter';
import type { SkillLoadResult } from '../../../shared/skills.types';

export async function loadSkill(name: string): Promise<SkillLoadResult | undefined> {
	const wanted = name.trim().toLowerCase();
	const skill = list()
		.filter((entry) => entry.manifest.enabled !== false)
		.find((entry) => entry.name.toLowerCase() === wanted || entry.id.toLowerCase() === wanted);
	if (!skill || !skill.skillPath) return undefined;
	const content = fs.readFileSync(skill.skillPath, 'utf8');
	return {
		name: skill.name,
		directory: skill.folderPath,
		content: stripFrontmatter(content),
	};
}
