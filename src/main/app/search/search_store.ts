import path from 'node:path';
import Store from 'electron-store';
import type { StoredProvider } from '../../../shared/provider_types';
import { userDataLocation } from '../../shared/user_data_location';

interface SearchSettingsState {
	providers: StoredProvider[];
}

const store = new Store<SearchSettingsState>({
	name: 'settings.search',
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: { providers: [] },
});

export const searchStorePath = store.path;

export function getSearchProviders(): StoredProvider[] {
	return store.get('providers');
}

export function setSearchProviders(providers: StoredProvider[]): void {
	store.set('providers', providers);
}
