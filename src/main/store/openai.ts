import type { ProviderConfig } from '../../shared/types';
import type { SettingsStore } from './types';

export function getOpenAIKey(store: SettingsStore): string {
	return store.get('providers').openai.apikey;
}

export function getOpenAIModel(store: SettingsStore): string {
	return store.get('providers').openai.model;
}

export function setOpenAIKey(store: SettingsStore, apikey: string): ProviderConfig {
	return setOpenAIProvider(store, apikey, getOpenAIModel(store));
}

export function setOpenAIModel(store: SettingsStore, model: string): ProviderConfig {
	return setOpenAIProvider(store, getOpenAIKey(store), model);
}

export function setOpenAIProvider(
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
		openai: next,
	});
	return next;
}
