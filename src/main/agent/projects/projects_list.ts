import { projects } from './projects_data';
import type { ProjectInfo } from './projects_types';

export function list(): ProjectInfo[] {
	return [...projects.values()].sort((a, b) => a.title.localeCompare(b.title));
}
