import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import { SettingsStore, StoreSchema } from './types';

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;
	}

	getProviderById(id: Provider['id']): Provider | undefined {
		return (this.store.get('providers') ?? []).find((p) => p.id === id);
	}
}
