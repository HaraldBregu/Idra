import path from 'node:path';
import { skillsRoot } from './skills_root';

export function resolveSkillFolder(id: string): string {
	if (!/^[a-z0-9._-]+$/i.test(id) || id === '.' || id === '..') {
		throw new Error(`Invalid skill id: "${id}".`);
	}
	const folder = path.resolve(skillsRoot, id);
	if (path.dirname(folder) !== path.resolve(skillsRoot)) {
		throw new Error(`Skill id "${id}" escapes the skills root.`);
	}
	return folder;
}
