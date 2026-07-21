import { getSelectedProject, setSelectedProject } from './projects_store';

export function unloadProject(): string | undefined {
	const selected = getSelectedProject();
	setSelectedProject(undefined);
	return selected;
}
