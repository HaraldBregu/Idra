import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../shared/search_types';
import { getStoredSearchProviders } from './search_get_providers';
import { searchStore } from './search_store';

export function getSearchSettings(): SearchSettings {
	const rawEngineId = searchStore.get('engineId') as unknown;
	const engineId =
		typeof rawEngineId === 'string' && SEARCH_ENGINE_IDS.includes(rawEngineId as SearchEngineId)
			? (rawEngineId as SearchEngineId)
			: 'brave';
	const providers = getStoredSearchProviders();
	const configured = Object.fromEntries(
		SEARCH_ENGINE_IDS.map((id) => {
			return [id, providers.some((provider) => provider.id === id && provider.apiKey.trim())];
		})
	) as Record<SearchEngineId, boolean>;

	return { engineId, configured };
}
