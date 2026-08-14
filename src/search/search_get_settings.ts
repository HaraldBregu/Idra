import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../shared/search_types';
import { getSearchEngine } from '../agent/agent_store';
import { getStoredSearchProviders } from './search_get_providers';

export function getSearchSettings(): SearchSettings {
	const providers = getStoredSearchProviders();
	const { providerId, enabled } = getSearchEngine();
	const engineId =
		enabled &&
		typeof providerId === 'string' &&
		SEARCH_ENGINE_IDS.includes(providerId as SearchEngineId)
			? (providerId as SearchEngineId)
			: null;
	const configured = Object.fromEntries(
		SEARCH_ENGINE_IDS.map((id) => {
			return [id, providers.some((provider) => provider.id === id && provider.apiKey.trim())];
		})
	) as Record<SearchEngineId, boolean>;

	return { engineId, configured };
}
