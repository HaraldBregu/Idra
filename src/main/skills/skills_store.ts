import Store from 'electron-store';
import { skillsRoot } from './skills_root';

export interface SkillSettings {
	enabled: boolean;
	name?: string;
	title?: string;
	description?: string;
}

export type SkillsSchema = {
	skills: Record<string, SkillSettings>;
};

const SETTINGS_STORE_NAME = 'settings';

const store = new Store<SkillsSchema>({
	name: SETTINGS_STORE_NAME,
	cwd: skillsRoot,
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

export function setSkills(skills: Record<string, SkillSettings>): void {
	store.set('skills', skills);
}

export function removeSkill(id: string): void {
	const next = { ...allSkills() };
	delete next[id];
	store.set('skills', next);
}
