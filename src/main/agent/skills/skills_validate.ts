import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { SkillValidationIssue, SkillValidationResult } from '../../../shared/skills_types';
import { SKILL_FILE, SKILL_MAX_BYTES } from './skills_limits';

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSkill(folder: string): SkillValidationResult {
	const issues: SkillValidationIssue[] = [];
	const skillPath = path.join(folder, SKILL_FILE);
	if (!fs.existsSync(skillPath)) {
		issues.push({ code: 'missing-skill-md', message: `${SKILL_FILE} not found in ${folder}.` });
		return { valid: false, issues };
	}
	let canonicalFolder: string;
	let canonicalSkillPath: string;
	let skillSize: number;
	try {
		canonicalFolder = fs.realpathSync(folder);
		canonicalSkillPath = fs.realpathSync(skillPath);
		skillSize = fs.statSync(canonicalSkillPath).size;
	} catch {
		return {
			valid: false,
			issues: [{ code: 'unreadable-skill', message: `${SKILL_FILE} could not be resolved.` }],
		};
	}
	const relativePath = path.relative(canonicalFolder, canonicalSkillPath);
	if (relativePath.startsWith(`..${path.sep}`) || relativePath === '..' || path.isAbsolute(relativePath)) {
		return {
			valid: false,
			issues: [
				{
					code: 'skill-path-escape',
					message: `${SKILL_FILE} resolves outside its skill folder.`,
				},
			],
		};
	}
	if (skillSize > SKILL_MAX_BYTES) {
		return {
			valid: false,
			issues: [
				{
					code: 'skill-too-large',
					message: `${SKILL_FILE} exceeds the ${SKILL_MAX_BYTES}-byte limit.`,
				},
			],
		};
	}
	let data: Record<string, unknown>;
	try {
		const source = fs.readFileSync(canonicalSkillPath, 'utf8');
		if (Buffer.byteLength(source, 'utf8') > SKILL_MAX_BYTES) {
			return {
				valid: false,
				issues: [
					{
						code: 'skill-too-large',
						message: `${SKILL_FILE} exceeds the ${SKILL_MAX_BYTES}-byte limit.`,
					},
				],
			};
		}
		data = matter(source).data as Record<string, unknown>;
	} catch {
		return {
			valid: false,
			issues: [{ code: 'invalid-skill-md', message: `${SKILL_FILE} could not be parsed.` }],
		};
	}
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
	if (
		data.allowedTools !== undefined &&
		(!Array.isArray(data.allowedTools) ||
			data.allowedTools.some((tool) => typeof tool !== 'string' || tool.trim() === ''))
	) {
		issues.push({
			code: 'invalid-allowed-tools',
			message: '"allowedTools" must be an array of non-empty tool names.',
		});
	}
	return { valid: issues.length === 0, issues };
}
