import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';

export interface SkillSettings {
	enabled: boolean;
	name?: string;
	title?: string;
	description?: string;
}

export type SkillsSchema = {
	skills: Record<string, SkillSettings>;
};

const SKILLS_STORE_NAME = 'skills';

const store = new Store<SkillsSchema>({
	name: SKILLS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: { skills: {} },
});

export function allSkills(): Record<string, SkillSettings> {
	return store.store.skills ?? {};
}

export function getSkill(id: string): SkillSettings | undefined {
	return allSkills()[id];
}

export function setSkill(id: string, settings: SkillSettings): void {
	store.set('skills', { ...allSkills(), [id]: settings });
}

export function removeSkill(id: string): void {
	const next = { ...allSkills() };
	delete next[id];
	store.set('skills', next);
}
