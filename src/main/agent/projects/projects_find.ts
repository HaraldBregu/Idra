import type { ProjectInfo } from './projects_types';
import { list } from './projects_list';

export function findProject(name: string): ProjectInfo | undefined {
	const wanted = name.trim().toLowerCase();
	const projects = list();
	return (
		projects.find((project) => project.id.toLowerCase() === wanted) ??
		projects.find((project) => project.title.toLowerCase() === wanted)
	);
}
