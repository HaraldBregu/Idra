import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import type { ProjectMetadata } from './projects_types';

type ProjectsSchema = {
	projects: Record<string, ProjectMetadata>;
};

const PROJECTS_STORE_NAME = 'projects';

const store = new Store<ProjectsSchema>({
	name: PROJECTS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
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
