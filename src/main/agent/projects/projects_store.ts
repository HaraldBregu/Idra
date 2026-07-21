import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';

export interface ProjectSettings {
	title: string;
	description: string;
}

export type ProjectsSchema = {
	projects: Record<string, ProjectSettings>;
	selected?: string;
};

const PROJECTS_STORE_NAME = 'projects';

const store = new Store<ProjectsSchema>({
	name: PROJECTS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: { projects: {} },
});

export function allProjects(): Record<string, ProjectSettings> {
	return store.store.projects ?? {};
}

export function setProject(id: string, settings: ProjectSettings): void {
	store.set('projects', { ...allProjects(), [id]: settings });
}

export function setProjects(projects: Record<string, ProjectSettings>): void {
	store.set('projects', projects);
}

export function removeProject(id: string): void {
	const next = { ...allProjects() };
	delete next[id];
	store.set('projects', next);
}

export function getSelectedProject(): string | undefined {
	return store.get('selected');
}

export function setSelectedProject(id: string | undefined): void {
	if (id === undefined) store.delete('selected');
	else store.set('selected', id);
}
