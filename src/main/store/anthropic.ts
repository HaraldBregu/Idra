import type { ProviderConfig } from '../../shared/types';
import type { SettingsStore } from './types';

export function getAnthropicKey(store: SettingsStore): string {
	return store.get('providers').anthropic.apikey;
}

export function getAnthropicModel(store: SettingsStore): string {
	return store.get('providers').anthropic.model;
}

export function setAnthropicKey(store: SettingsStore, apikey: string): ProviderConfig {
	return setAnthropicProvider(store, apikey, getAnthropicModel(store));
}

export function setAnthropicModel(store: SettingsStore, model: string): ProviderConfig {
	return setAnthropicProvider(store, getAnthropicKey(store), model);
}

export function setAnthropicProvider(
	store: SettingsStore,
	apikey: string,
	model: string
): ProviderConfig {
	const next: ProviderConfig = {
		apikey,
		model,
	};
	const providers = store.get('providers');
	store.set('providers', {
		...providers,
		anthropic: next,
	});
	return next;
}
