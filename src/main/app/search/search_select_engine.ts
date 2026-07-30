import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../../shared/search_types';
import { setSearchProviders } from '../settings_store';
import { getSearchSettings } from './search_get_settings';
import { getStoredSearchProviders } from './search_get_providers';

export function selectSearchEngine(engineId: SearchEngineId): SearchSettings {
	if (!SEARCH_ENGINE_IDS.includes(engineId)) throw new Error('Unknown search engine.');
	if (!getSearchSettings().configured[engineId]) {
		throw new Error('Configure this search engine before selecting it.');
	}
	const providers = getStoredSearchProviders();
	setSearchProviders([
		...providers.filter((provider) => provider.id === engineId),
		...providers.filter((provider) => provider.id !== engineId),
	]);
	return getSearchSettings();
}
