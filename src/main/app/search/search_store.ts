import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';

interface SearchSettingsState {
	providerId?: string;
	searchId?: string;
}

const store = new Store<SearchSettingsState>({
	name: 'settings.search',
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: { providerId: undefined, searchId: undefined },
});

export const searchStorePath = store.path;

export function getSearchConfiguration(): SearchSettingsState {
	return store.store;
}

export function saveSearchConfiguration(configuration: SearchSettingsState): void {
	store.store = configuration;
}
