import fs from 'node:fs';
import path from 'node:path';
import type { ProjectInfo } from './projects_types';
import { projectsRoot } from './projects_root';
import { readProject } from './projects_read';

export function list(): ProjectInfo[] {
	if (!fs.existsSync(projectsRoot)) return [];
	const projects: ProjectInfo[] = [];
	for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const info = readProject(path.join(projectsRoot, entry.name), entry.name);
		if (info) projects.push(info);
	}
	return projects.sort((a, b) => a.title.localeCompare(b.title));
}
