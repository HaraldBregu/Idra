import path from 'node:path';
import Store from 'electron-store';
import type { Provider } from '../types';
import {
	getProvider as getStoredProvider,
	setProvider as setStoredProvider,
} from '../../providers';
import { agentLocation } from '../shared/agent-location';
import { DEFAULT_AGENT_SETTINGS, type SettingsSchema } from './settings-types';

const SETTINGS_STORE_NAME = 'settings';

const store = new Store<SettingsSchema>({
	name: SETTINGS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_AGENT_SETTINGS,
});

export function getProvider(): Provider | undefined {
	const providerId = getProviderId();
	if (!providerId) return undefined;
	const provider = providerStore.get(providerId);
	if (!provider) return undefined;
	return {
		id: providerId,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
}

export function setProvider(provider: Provider): void {
	const existing = providerStore.get(provider.id);
	providerStore.set(provider.id, {
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
