import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { StoredProvider } from '../../shared/provider_types';
import { userDataLocation } from '../shared/user_data_location';

export type SearchStoreState = StoredProvider[];

export const SEARCH_PROVIDERS: readonly Omit<StoredProvider, 'apiKey'>[] = [
	{
		id: 'brave',
		name: 'Brave',
		baseUrl: 'https://api.search.brave.com/res/v1/web/search',
	},
	{
		id: 'tavily',
		name: 'Tavily',
		baseUrl: 'https://api.tavily.com/search',
	},
];

export const DEFAULT_SEARCH_STORE: SearchStoreState = [];

class SearchStore {
	readonly path = path.resolve(userDataLocation(), 'search', 'settings.json');
	private memory: SearchStoreState = structuredClone(DEFAULT_SEARCH_STORE);

	get store(): SearchStoreState {
		if (process.env.NODE_ENV === 'test') return structuredClone(this.memory);
		if (!existsSync(this.path)) return [];
		try {
			const parsed = JSON.parse(readFileSync(this.path, 'utf8')) as unknown;
			if (Array.isArray(parsed)) return parsed as SearchStoreState;
			if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.providers)) {
				this.store = parsed.providers as SearchStoreState;
				return parsed.providers as SearchStoreState;
			}
		} catch {}
		return [];
	}

	set store(providers: SearchStoreState) {
		if (process.env.NODE_ENV === 'test') {
			this.memory = structuredClone(providers);
			return;
		}
		mkdirSync(path.dirname(this.path), { recursive: true });
		writeFileSync(this.path, `${JSON.stringify(providers, null, '\t')}\n`, 'utf8');
	}
}

export const searchStore = new SearchStore();
