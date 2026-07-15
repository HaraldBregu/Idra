import path from 'node:path';
import Store from 'electron-store';
import type { SearchEngineId, SearchEngineInput } from '../../shared/search_types';
import { userDataLocation } from '../shared/user_data_location';

export interface SearchStoreState {
	engineId: SearchEngineId;
	engines: Record<SearchEngineId, SearchEngineInput>;
}

export const DEFAULT_SEARCH_STORE: SearchStoreState = {
	engineId: 'brave',
	engines: {
		brave: { apiKey: '' },
		tavily: { apiKey: '' },
	},
};

export const searchStore = new Store<SearchStoreState>({
	name: 'settings',
	cwd: path.resolve(userDataLocation(), 'search'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SEARCH_STORE,
});
