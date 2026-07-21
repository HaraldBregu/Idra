import type { ProjectMetadata } from './projects_types';
import { list } from './projects_list';
import { getSelectedProject, setProjects, setSelectedProject } from './projects_store';

export function sync(): void {
	const next: Record<string, ProjectMetadata> = {};
	for (const project of list()) {
		next[project.id] = { title: project.title, description: project.description };
	}
	setProjects(next);
	const selected = getSelectedProject();
	if (selected && !next[selected]) setSelectedProject(undefined);
}
