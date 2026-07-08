import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillValidationIssue, SkillValidationResult } from '../../../shared/skills_types';
import { SKILL_FILE } from './skills_read';

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSkill(folder: string): SkillValidationResult {
	const issues: SkillValidationIssue[] = [];
	const skillPath = path.join(folder, SKILL_FILE);
	if (!fs.existsSync(skillPath)) {
		issues.push({ code: 'missing-skill-md', message: `${SKILL_FILE} not found in ${folder}.` });
		return { valid: false, issues };
	}
	const data = matter(fs.readFileSync(skillPath, 'utf8')).data as Record<string, unknown>;
	if (typeof data.name !== 'string' || data.name.trim() === '') {
		issues.push({ code: 'missing-name', message: 'SKILL.md frontmatter is missing "name".' });
	} else if (data.name.length > 64 || !NAME_PATTERN.test(data.name)) {
		issues.push({
			code: 'invalid-name',
			message:
				'"name" must be 1-64 lowercase alphanumeric characters and hyphens, without leading, trailing, or consecutive hyphens.',
		});
	}
	if (typeof data.description !== 'string' || data.description.trim() === '') {
		issues.push({
			code: 'missing-description',
			message: 'SKILL.md frontmatter is missing "description".',
		});
	} else if (data.description.length > 1024) {
		issues.push({
			code: 'invalid-description',
			message: '"description" must be at most 1024 characters.',
		});
	}
	return { valid: issues.length === 0, issues };
}
