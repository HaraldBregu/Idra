import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../shared/search_types';
import { getStoredSearchProviders } from './search_get_providers';

export function getSearchSettings(): SearchSettings {
	const providers = getStoredSearchProviders();
	const engineId =
		providers[0] && SEARCH_ENGINE_IDS.includes(providers[0].id as SearchEngineId)
			? (providers[0].id as SearchEngineId)
			: 'brave';
	const configured = Object.fromEntries(
		SEARCH_ENGINE_IDS.map((id) => {
			return [id, providers.some((provider) => provider.id === id && provider.apiKey.trim())];
		})
	) as Record<SearchEngineId, boolean>;

	return { engineId, configured };
}
