import fs from 'node:fs';
import path from 'node:path';
import { projects } from './projects_data';
import { findProject } from './projects_find';
import { PROJECT_FILE } from './projects_read';
import type { ProjectInfo } from './projects_types';

export function updateProject(
	name: string,
	updates: { title?: string; description?: string; instructions?: string }
): ProjectInfo | undefined {
	const project = findProject(name);
	if (!project) return undefined;
	const title = updates.title ?? project.title;
	const description = updates.description ?? project.description;
	fs.writeFileSync(
		path.join(project.folderPath, PROJECT_FILE),
		JSON.stringify({ title, description }, null, '\t') + '\n'
	);
	if (updates.instructions !== undefined)
		fs.writeFileSync(project.instructionsPath, updates.instructions);
	const updated: ProjectInfo = { ...project, title, description };
	projects.set(project.id, updated);
	return updated;
}
