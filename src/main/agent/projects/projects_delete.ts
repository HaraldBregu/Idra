import fs from 'node:fs';
import { projects } from './projects_data';
import { findProject } from './projects_find';

export function deleteProject(
	name: string
): { id: string; title: string; deleted: boolean } | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	fs.rmSync(project.folderPath, { recursive: true, force: true });
	projects.delete(project.id);
	return { id: project.id, title: project.title, deleted: true };
}
