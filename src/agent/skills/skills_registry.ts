import fs from 'node:fs';
import path from 'node:path';
import type {
	SkillDiagnostic,
	SkillInfo,
	SkillRegistrySnapshot,
} from '../../shared/skills_types';
import { skillsRoot } from './skills_root';
import { readSkill } from './skills_read';
import { validateSkill } from './skills_validate';

export function createSkillRegistrySnapshot(): SkillRegistrySnapshot {
	if (!fs.existsSync(skillsRoot)) return Object.freeze({ skills: [], diagnostics: [] });
	const skills: SkillInfo[] = [];
	const diagnostics: SkillDiagnostic[] = [];
	const names = new Set<string>();
	const entries = fs
		.readdirSync(skillsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.sort((a, b) => a.name.localeCompare(b.name));
	for (const entry of entries) {
		const folder = path.join(skillsRoot, entry.name);
		const validation = validateSkill(folder);
		if (!validation.valid) {
			for (const issue of validation.issues) {
				diagnostics.push({
					level: 'error',
					code: issue.code,
					message: `${entry.name}: ${issue.message}`,
				});
			}
			continue;
		}
		const skill = readSkill(folder, entry.name);
		if (!skill) continue;
		const key = skill.name.toLowerCase();
		if (names.has(key)) {
			diagnostics.push({
				level: 'error',
				code: 'duplicate-name',
				message: `Skill "${skill.name}" is shadowed by an earlier skill with the same name.`,
			});
			continue;
		}
		names.add(key);
		skills.push(Object.freeze(skill));
	}
	return Object.freeze({ skills: Object.freeze(skills), diagnostics: Object.freeze(diagnostics) });
}
