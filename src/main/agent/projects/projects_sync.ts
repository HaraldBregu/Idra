import fs from 'node:fs';
import path from 'node:path';
import { projects } from './projects_data';
import { readProject } from './projects_read';
import { projectsRoot } from './projects_root';

export function sync(): void {
	projects.clear();
	if (!fs.existsSync(projectsRoot)) return;
	for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const info = readProject(path.join(projectsRoot, entry.name), entry.name);
		if (info) projects.set(info.id, info);
	}
}
