import path from 'node:path';
import ElectronStore from 'electron-store';
import type { Config } from '../core/config';

export interface SkillSettings {
	enabled: boolean;
}

export type SkillsSchema = {
	skills: Record<string, SkillSettings>;
};

const SKILLS_STORE_NAME = 'skills';

export class SkillsStore {
	private readonly skills: ElectronStore<SkillsSchema>;

	constructor(private readonly config: Config, defaults: SkillsSchema) {
		this.skills = new ElectronStore<SkillsSchema>({
			name: SKILLS_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults,
		});
	}

	all(): Record<string, SkillSettings> {
		return this.skills.store.skills ?? {};
	}

	get(id: string): SkillSettings | undefined {
		return this.all()[id];
	}

	set(id: string, settings: SkillSettings): void {
		this.skills.set('skills', { ...this.all(), [id]: settings });
	}

	remove(id: string): void {
		const next = { ...this.all() };
		delete next[id];
		this.skills.set('skills', next);
	}
}
