import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchEngineInput,
	type SearchSettings,
} from '../../../shared/search_types';
import { setSearchProviders } from '../settings_store';
import { getSearchSettings } from './search_get_settings';
import { getStoredSearchProviders } from './search_get_providers';
import { SEARCH_PROVIDERS } from './catalog';
import { getSearchConfiguration, saveSearchConfiguration } from './search_store';

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
	const providersById = new Map(getStoredSearchProviders().map((provider) => [provider.id, provider]));
	providersById.set(engineId, { ...catalogProvider, apiKey });
	const providers = SEARCH_PROVIDERS.flatMap((provider) => {
		const stored = providersById.get(provider.id);
		return stored ? [{ ...provider, apiKey: stored.apiKey }] : [];
	});
	setSearchProviders(providers);
	if (!previousSettings.configured[previousSettings.engineId]) {
		saveSearchConfiguration({ providerId: engineId, searchId: catalogProvider.searchId });
	}

	return getSearchSettings();
}
