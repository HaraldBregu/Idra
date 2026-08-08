import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { list } from './skills_list';
import { readSkill } from './skills_read';
import { SKILL_MAX_BYTES } from './skills_limits';
import { stripFrontmatter } from './skills_strip_frontmatter';
import type { SkillLoadResult } from '../../../shared/skills_types';

export async function loadSkill(name: string): Promise<SkillLoadResult | undefined> {
	const wanted = name.trim().toLowerCase();
	const skill = list()
		.filter((entry) => entry.manifest.enabled !== false)
		.find((entry) => entry.name.toLowerCase() === wanted || entry.id.toLowerCase() === wanted);
	if (!skill || !skill.skillPath) return undefined;
	const current = readSkill(skill.folderPath, skill.id);
	if (!current?.skillPath) return undefined;
	const source = fs.readFileSync(current.skillPath, 'utf8');
	if (Buffer.byteLength(source, 'utf8') > SKILL_MAX_BYTES) {
		throw new Error(`Skill "${skill.name}" exceeds the ${SKILL_MAX_BYTES}-byte limit.`);
	}
	if (createHash('sha256').update(source).digest('hex') !== current.hash) {
		throw new Error(`Skill "${skill.name}" changed while it was loading. Retry the request.`);
	}
	return {
		id: current.id,
		name: current.name,
		directory: current.folderPath,
		content: stripFrontmatter(source),
		source: current.source,
		trust: current.trust,
		hash: current.hash,
		allowedTools: current.manifest.allowedTools,
	};
}
