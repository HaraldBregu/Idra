import type { ProjectInfo } from './projects_types';
import { list } from './projects_list';

export function findProject(name: string): ProjectInfo | undefined {
	const wanted = name.trim().toLowerCase();
	return list().find(
		(project) => project.id.toLowerCase() === wanted || project.title.toLowerCase() === wanted
	);
}
