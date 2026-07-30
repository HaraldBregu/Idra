import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../../shared/search_types';
import { getStoredSearchProviders } from './search_get_providers';
import { getSearchConfiguration } from './search_store';

export function getSearchSettings(): SearchSettings {
	const providers = getStoredSearchProviders();
	const { providerId } = getSearchConfiguration();
	const engineId =
		typeof providerId === 'string' && SEARCH_ENGINE_IDS.includes(providerId as SearchEngineId)
			? (providerId as SearchEngineId)
			: 'brave';
	const configured = Object.fromEntries(
		SEARCH_ENGINE_IDS.map((id) => {
			return [id, providers.some((provider) => provider.id === id && provider.apiKey.trim())];
		})
	) as Record<SearchEngineId, boolean>;

	return { engineId, configured };
}
