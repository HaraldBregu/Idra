import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import { DEFAULT_HEALTH_SETTINGS, type HealthSettings } from './health_types';

const HEALTH_STORE_NAME = 'settings.health';

const store = new Store<HealthSettings>({
	name: HEALTH_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_HEALTH_SETTINGS,
});

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
