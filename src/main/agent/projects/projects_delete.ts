import fs from 'node:fs';
import { findProject } from './projects_find';
import { getSelectedProject, removeProject, setSelectedProject } from './projects_store';

export function deleteProject(
	name: string
): { id: string; title: string; deleted: boolean } | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	fs.rmSync(project.folderPath, { recursive: true, force: true });
	removeProject(project.id);
	if (getSelectedProject() === project.id) setSelectedProject(undefined);
	return { id: project.id, title: project.title, deleted: true };
}
