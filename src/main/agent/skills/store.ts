import path from 'node:path';
import { app } from 'electron';
import Store from 'electron-store';

export interface SkillSettings {
	enabled: boolean;
}

type SkillsStoreSchema = {
	skills: Record<string, SkillSettings>;
};

const DEFAULT_SETTINGS: SkillsStoreSchema = { skills: {} };

export class SkillsStore {
	private readonly store: Store<SkillsStoreSchema>;

	constructor(cwd?: string) {
		this.store = new Store<SkillsStoreSchema>({
			name: 'settings',
			cwd: cwd ?? resolveSkillsRoot(),
			accessPropertiesByDotNotation: false,
			defaults: DEFAULT_SETTINGS,
		});
	}

	all(): Record<string, SkillSettings> {
		return this.store.store.skills ?? {};
	}

	get(id: string): SkillSettings | undefined {
		return this.all()[id];
	}

	set(id: string, settings: SkillSettings): void {
		this.store.set('skills', { ...this.all(), [id]: settings });
	}

	remove(id: string): void {
		const next = { ...this.all() };
		delete next[id];
		this.store.set('skills', next);
	}
}

export function resolveSkillsRoot(): string {
	try {
		return path.join(app.getPath('appData'), app.getName(), 'skills');
	} catch {
		const base =
			process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'skills');
	}
}
