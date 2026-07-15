import type { SearchEngineId } from '../../shared/search_types';
import { searchStore } from './search_store';

export function getSearchKey(engineId: SearchEngineId): string | undefined {
	const rawEngines = searchStore.get('engines') as unknown;
	const engines =
		typeof rawEngines === 'object' && rawEngines !== null
			? (rawEngines as Record<string, unknown>)
			: {};
	const engine = engines[engineId];
	const storedKey =
		typeof engine === 'object' &&
		engine !== null &&
		typeof (engine as Record<string, unknown>).apiKey === 'string'
			? (engine as Record<string, string>).apiKey.trim()
			: '';
	if (storedKey) return storedKey;

	const environmentKey =
		engineId === 'brave' ? process.env.BRAVE_API_KEY : process.env.TAVILY_API_KEY;
	return environmentKey?.trim() || undefined;
}
