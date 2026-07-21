import type { ProjectInfo } from './projects_types';
import { findProject } from './projects_find';
import { readInstructions } from './projects_instructions';
import { setSelectedProject } from './projects_store';

export function selectProject(
	name: string
): { project: ProjectInfo; instructions: string } | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	setSelectedProject(project.id);
	return { project, instructions: readInstructions(project) };
}
