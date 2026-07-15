import {
	SEARCH_ENGINE_IDS,
	type SearchEngineId,
	type SearchEngineInput,
	type SearchSettings,
} from '../../shared/search_types';
import { getSearchSettings } from './search_get_settings';
import { searchStore } from './search_store';

export function saveSearchEngine(
	engineId: SearchEngineId,
	input: SearchEngineInput
): SearchSettings {
	if (!SEARCH_ENGINE_IDS.includes(engineId)) throw new Error('Unknown search engine.');
	const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
	if (!apiKey) throw new Error('A search engine API key is required.');

	const previousSettings = getSearchSettings();
	const rawEngines = searchStore.get('engines') as unknown;
	const engines =
		typeof rawEngines === 'object' && rawEngines !== null
			? (rawEngines as Record<string, unknown>)
			: {};
	searchStore.set('engines', { ...engines, [engineId]: { apiKey } });
	if (!previousSettings.configured[previousSettings.engineId]) {
		searchStore.set('engineId', engineId);
	}

	return getSearchSettings();
}
