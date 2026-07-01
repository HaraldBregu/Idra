import path from 'node:path';
import Store from 'electron-store';
import type { HealthSettings } from './types';
import { Config } from '../core/config';

const HEALTH_STORE_NAME = 'health';

export class HealthStore {
	private readonly store: Store<HealthSettings>;

	constructor(private readonly config: Config, private readonly defaults: HealthSettings) {
		this.store = new Store<HealthSettings>({
			name: HEALTH_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults,
		});
	}

	getSettings(): HealthSettings {
		return this.store.store;
	}

	updateSettings(patch: Partial<HealthSettings>): HealthSettings {
		const next = { ...this.getSettings(), ...patch };
		this.store.store = next;
		return next;
	}

	resetSettings(): HealthSettings {
		this.store.store = this.defaults;
		return this.getSettings();
	}
}
