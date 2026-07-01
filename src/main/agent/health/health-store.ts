import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../shared/location';

export type HealthEvery = '0m' | '1m' | '30m' | '1h';

export type HealthTarget = 'none' | 'last' | string;

export type HealthDirectPolicy = 'allow' | 'block';

export interface HealthActiveHours {
	start: string;
	end: string;
}

export interface HealthSettings {
	every: HealthEvery;
	target: HealthTarget;
	directPolicy: HealthDirectPolicy;
	lightContext: boolean;
	isolatedSession: boolean;
	skipWhenBusy: boolean;
	activeHours?: HealthActiveHours;
	includeReasoning?: boolean;
}

export const DEFAULT_HEALTH_SETTINGS: HealthSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};

const HEALTH_STORE_NAME = 'health';

const store = new Store<HealthSettings>({
	name: HEALTH_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_HEALTH_SETTINGS,
});

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
