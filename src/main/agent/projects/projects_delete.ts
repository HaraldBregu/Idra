import fs from 'node:fs';
import { findProject } from './projects_find';
import { removeProject } from './projects_store';

export function deleteProject(
	name: string
): { id: string; title: string; deleted: boolean } | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	fs.rmSync(project.folderPath, { recursive: true, force: true });
	removeProject(project.id);
	return { id: project.id, title: project.title, deleted: true };
}
