import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../shared/search_types';
import { getSearchSettings } from './search_get_settings';
import { searchStore } from './search_store';
import { getStoredSearchProviders } from './search_get_providers';

export function selectSearchEngine(engineId: SearchEngineId): SearchSettings {
	if (!SEARCH_ENGINE_IDS.includes(engineId)) throw new Error('Unknown search engine.');
	if (!getSearchSettings().configured[engineId]) {
		throw new Error('Configure this search engine before selecting it.');
	}
	const providers = getStoredSearchProviders();
	searchStore.store = [
		...providers.filter((provider) => provider.id === engineId),
		...providers.filter((provider) => provider.id !== engineId),
	];
	return getSearchSettings();
}
