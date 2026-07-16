import path from 'node:path';
import Store from 'electron-store';
import type { Provider } from '../types';
import {
	getProvider as getStoredProvider,
	setProvider as setStoredProvider,
} from '../../providers';
import { agentLocation } from '../../shared/agent_location';
import type { GoalBudget } from '../run/run_goal_types';
import { DEFAULT_AGENT_SETTINGS, DEFAULT_GOAL_SETTINGS, type SettingsSchema } from './settings_types';

const SETTINGS_STORE_NAME = 'settings';

const store = new Store<SettingsSchema>({
	name: SETTINGS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_SETTINGS,
});

export function getProvider(providerId: string | undefined = getProviderId()): Provider | undefined {
	if (!providerId) return undefined;
	const provider = getStoredProvider(providerId);
	if (!provider) return undefined;
	return {
		id: providerId,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
}

export function setProvider(provider: Provider): void {
	const existing = getStoredProvider(provider.id);
	setStoredProvider(provider.id, {
		name: existing?.name ?? provider.id,
		apiKey: provider.apiKey,
		baseUrl: provider.baseURL,
	});
	setProviderId(provider.id);
}

export function getVersion(): number {
	return store.get('version');
}

export function getProviderId(): string | undefined {
	return store.get('providerId');
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

// Merging with the defaults keeps settings files written before the goal
// section existed working.
export function getGoalSettings(): GoalBudget {
	return { ...DEFAULT_GOAL_SETTINGS, ...store.get('goal') };
}

export function setGoalSettings(settings: Partial<GoalBudget>): GoalBudget {
	const next = { ...getGoalSettings(), ...settings };
	store.set('goal', next);
	return next;
}
