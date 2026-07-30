import path from 'node:path';
import Store from 'electron-store';
import type { StoredProvider } from '../../shared/provider_types';
import type { SearchEngineId } from '../../shared/search_types';
import { userDataLocation } from '../shared/user_data_location';

export interface SearchStoreState {
	engineId: SearchEngineId;
	providers: StoredProvider[];
}

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

export const DEFAULT_SEARCH_STORE: SearchStoreState = {
	engineId: 'brave',
	providers: [],
};

export const searchStore = new Store<SearchStoreState>({
	name: 'settings',
	cwd: path.resolve(userDataLocation(), 'search'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SEARCH_STORE,
});
