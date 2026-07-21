import path from 'node:path';
import { projectsRoot } from './projects_root';

export function resolveProjectFolder(id: string): string {
	if (!/^[a-z0-9._-]+$/i.test(id) || id === '.' || id === '..') {
		throw new Error(`Invalid project name: "${id}".`);
	}
	const folder = path.resolve(projectsRoot, id);
	if (path.dirname(folder) !== path.resolve(projectsRoot)) {
		throw new Error(`Project name "${id}" escapes the projects root.`);
	}
	return folder;
}
