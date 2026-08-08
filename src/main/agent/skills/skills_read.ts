import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import type { SkillInfo, SkillManifest } from '../../../shared/skills_types';
import { SKILL_FILE } from './skills_limits';
import { validateSkill } from './skills_validate';

export { SKILL_FILE } from './skills_limits';
const RESOURCE_DIRECTORIES = ['scripts', 'references', 'assets'] as const;

export function readSkill(folder: string, id: string): SkillInfo | undefined {
	if (!validateSkill(folder).valid) return undefined;
	const skillPath = path.join(folder, SKILL_FILE);
	const canonicalSkillPath = fs.realpathSync(skillPath);
	const source = fs.readFileSync(canonicalSkillPath, 'utf8');
	const fm = matter(source).data as Partial<SkillManifest>;
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
		skillPath: canonicalSkillPath,
		manifest,
		source: 'local-filesystem',
		trust: 'user-controlled',
		hash: createHash('sha256').update(source).digest('hex'),
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
