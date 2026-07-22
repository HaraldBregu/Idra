import Store from 'electron-store';
import { projectsRoot } from './projects_root';
import type { ProjectMetadata } from './projects_types';

type ProjectsSchema = {
	projects: Record<string, ProjectMetadata>;
};

const SETTINGS_STORE_NAME = 'settings';

const store = new Store<ProjectsSchema>({
	name: SETTINGS_STORE_NAME,
	cwd: projectsRoot,
	accessPropertiesByDotNotation: false,
	defaults: { projects: {} },
});

function allProjects(): Record<string, ProjectMetadata> {
	return store.store.projects ?? {};
}

export function setProject(id: string, metadata: ProjectMetadata): void {
	store.set('projects', { ...allProjects(), [id]: metadata });
}

export function setProjects(projects: Record<string, ProjectMetadata>): void {
	store.set('projects', projects);
}

export function removeProject(id: string): void {
	const next = { ...allProjects() };
	delete next[id];
	store.set('projects', next);
}
