import fs from 'node:fs';
import path from 'node:path';
import { SKILL_FILE, SKILL_RESOURCE_LIST_LIMIT } from './skills_limits';
import { resolveSkillResource } from './skills_resolve_resource';

export function listSkillResources(canonicalRoot: string): string[] {
	const resources: string[] = [];
	const pending = [''];
	while (pending.length > 0 && resources.length < SKILL_RESOURCE_LIST_LIMIT) {
		const relativeDirectory = pending.pop() as string;
		const directory = path.join(canonicalRoot, relativeDirectory);
		const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) {
			const relativePath = path.join(relativeDirectory, entry.name);
			if (relativePath === SKILL_FILE) continue;
			if (entry.isDirectory()) {
				pending.push(relativePath);
				continue;
			}
			if (!entry.isFile() && !entry.isSymbolicLink()) continue;
			resolveSkillResource(canonicalRoot, relativePath);
			resources.push(relativePath.split(path.sep).join('/'));
			if (resources.length >= SKILL_RESOURCE_LIST_LIMIT) break;
		}
	}
	return resources.sort();
}
