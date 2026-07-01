import path from 'node:path';
import ElectronStore from 'electron-store';
import type { Config } from '../core/config';

export interface SkillSettings {
	enabled: boolean;
}

export type SkillsSchema = {
	skills: Record<string, SkillSettings>;
};

export const DEFAULT_SKILLS: SkillsSchema = { skills: {} };

const SKILLS_STORE_NAME = 'skills';

export type SkillsStore = ElectronStore<SkillsSchema>;

export function createSkillsStore(config: Config, defaults: SkillsSchema): SkillsStore {
	return new ElectronStore<SkillsSchema>({
		name: SKILLS_STORE_NAME,
		cwd: path.resolve(config.location),
		accessPropertiesByDotNotation: false,
		defaults,
	});
}

export function allSkills(store: SkillsStore): Record<string, SkillSettings> {
	return store.store.skills ?? {};
}

export function getSkill(store: SkillsStore, id: string): SkillSettings | undefined {
	return allSkills(store)[id];
}

export function setSkill(store: SkillsStore, id: string, settings: SkillSettings): void {
	store.set('skills', { ...allSkills(store), [id]: settings });
}

export function removeSkill(store: SkillsStore, id: string): void {
	const next = { ...allSkills(store) };
	delete next[id];
	store.set('skills', next);
}
