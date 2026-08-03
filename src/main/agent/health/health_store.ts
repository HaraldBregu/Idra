import path from 'node:path';
import { existsSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import { DEFAULT_HEALTH_SETTINGS, type HealthSettings } from './health_types';

const HEALTH_STORE_NAME = 'health';
const agentDirectory = path.resolve(userDataLocation(), 'agent');
const hasHealthStore = existsSync(path.join(agentDirectory, 'health.json'));

const store = new Store<HealthSettings>({
	name: HEALTH_STORE_NAME,
	cwd: agentDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_HEALTH_SETTINGS,
});

if (!hasHealthStore && existsSync(path.join(agentDirectory, 'settings.health.json'))) {
	const legacyStore = new Store<HealthSettings>({
		name: 'settings.health',
		cwd: agentDirectory,
		accessPropertiesByDotNotation: false,
		defaults: DEFAULT_HEALTH_SETTINGS,
	});
	store.store = legacyStore.store;
}

export const healthStorePath = store.path;

export function getHealthSettings(): HealthSettings {
	return store.store;
}

export function updateHealthSettings(patch: Partial<HealthSettings>): HealthSettings {
	const next = { ...getHealthSettings(), ...patch };
	store.store = next;
	return next;
}

export function resetHealthSettings(): HealthSettings {
	store.store = DEFAULT_HEALTH_SETTINGS;
	return getHealthSettings();
}
