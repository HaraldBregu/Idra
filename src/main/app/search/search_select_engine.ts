import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../../shared/search_types';
import { getStoredSearchProviders } from './search_get_providers';
import { SEARCH_PROVIDERS } from './catalog';
import { getSearchSettings } from './search_get_settings';
import { saveSearchConfiguration } from './search_store';

export function selectSearchEngine(engineId: SearchEngineId): SearchSettings {
	if (!SEARCH_ENGINE_IDS.includes(engineId)) throw new Error('Unknown search engine.');
	if (!getSearchSettings().configured[engineId]) {
		throw new Error('Configure this search engine before selecting it.');
	}
	const provider = getStoredSearchProviders().find((entry) => entry.id === engineId);
	const catalogProvider = SEARCH_PROVIDERS.find((entry) => entry.id === engineId);
	if (!provider || !catalogProvider) throw new Error('Unknown search engine.');
	saveSearchConfiguration({ providerId: provider.id, searchId: catalogProvider.searchId });
	return getSearchSettings();
}
