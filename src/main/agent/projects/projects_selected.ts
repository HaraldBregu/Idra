import type { ProjectInfo } from './projects_types';
import { findProject } from './projects_find';
import { readInstructions } from './projects_instructions';
import { getSelectedProject } from './projects_store';

export function selectedProject(): { project: ProjectInfo; instructions: string } | undefined {
	const id = getSelectedProject();
	if (!id) return undefined;
	const project = findProject(id);
	if (!project) return undefined;
	return { project, instructions: readInstructions(project) };
}
