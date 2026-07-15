import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchSettings,
} from '../../shared/search_types';
import { searchStore } from './search_store';

export function getSearchSettings(): SearchSettings {
	const rawEngineId = searchStore.get('engineId') as unknown;
	const engineId =
		typeof rawEngineId === 'string' && SEARCH_ENGINE_IDS.includes(rawEngineId as SearchEngineId)
			? (rawEngineId as SearchEngineId)
			: 'brave';
	const rawEngines = searchStore.get('engines') as unknown;
	const engines =
		typeof rawEngines === 'object' && rawEngines !== null
			? (rawEngines as Record<string, unknown>)
			: {};
	const configured = Object.fromEntries(
		SEARCH_ENGINE_IDS.map((id) => {
			const value = engines[id];
			const apiKey =
				typeof value === 'object' &&
				value !== null &&
				typeof (value as Record<string, unknown>).apiKey === 'string'
					? (value as Record<string, string>).apiKey.trim()
					: '';
			return [id, apiKey.length > 0];
		})
	) as Record<SearchEngineId, boolean>;

	return { engineId, configured };
}
