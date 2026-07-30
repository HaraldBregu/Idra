import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchEngineInput,
	type SearchSettings,
} from '../../shared/search_types';
import { getSearchSettings } from './search_get_settings';
import { getStoredSearchProviders } from './search_get_providers';
import { SEARCH_PROVIDERS, searchStore } from './search_store';

export function saveSearchEngine(
	engineId: SearchEngineId,
	input: SearchEngineInput
): SearchSettings {
	if (!SEARCH_ENGINE_IDS.includes(engineId)) throw new Error('Unknown search engine.');
	const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
	if (!apiKey) throw new Error('A search engine API key is required.');

	const previousSettings = getSearchSettings();
	const catalogProvider = SEARCH_PROVIDERS.find((provider) => provider.id === engineId);
	if (!catalogProvider) throw new Error('Unknown search engine.');
	const providers = getStoredSearchProviders();
	const provider = { ...catalogProvider, apiKey };
	searchStore.set('providers', [
		...providers.filter((entry) => entry.id !== engineId),
		provider,
	]);
	if (!previousSettings.configured[previousSettings.engineId]) {
		searchStore.set('engineId', engineId);
	}

	return getSearchSettings();
}
