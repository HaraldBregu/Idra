import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../shared/location';
import { DEFAULT_HEALTH_SETTINGS, type HealthSettings } from './types';

const HEALTH_STORE_NAME = 'health';

const store = new Store<HealthSettings>({
	name: HEALTH_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_HEALTH_SETTINGS,
});

export function getHealthStore(): HealthSettings {
	return store.store;
}

export function setHealthStore(value: HealthSettings): void {
	store.store = value;
}
