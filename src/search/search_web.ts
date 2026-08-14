import type { SearchEngineId, SearchRequest, SearchResponse } from '../../shared/search_types';
import type { SearchAdapter } from './adapters/adapter';
import { searchBrave } from './adapters/brave';
import { searchTavily } from './adapters/tavily';
import { getSearchKey } from './search_get_key';
import { getSearchSettings } from './search_get_settings';

const searchers: Record<SearchEngineId, SearchAdapter> = {
	brave: searchBrave,
	tavily: searchTavily,
};

export async function searchWeb(
	request: SearchRequest,
	signal?: AbortSignal
): Promise<SearchResponse> {
	const { engineId } = getSearchSettings();
	if (!engineId) {
		throw new Error('Select a search engine in Settings > Agent before using search_web.');
	}
	const apiKey = getSearchKey(engineId);
	if (!apiKey) {
		throw new Error(
			`Configure ${engineId === 'brave' ? 'Brave' : 'Tavily'} in Settings > Search engine before using search_web.`
		);
	}

	return searchers[engineId]({ query: request.query, count: request.count ?? 5 }, apiKey, signal);
}
