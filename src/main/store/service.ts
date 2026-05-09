import Store from 'electron-store';
import type { Provider } from '../../shared/providers';
import type { Assistant } from '../../shared/service';
import { SettingsStore, StoreSchema } from './types';

export class StoreService {
	private store: SettingsStore;

	constructor() {
		this.store = new Store<StoreSchema>({
			name: 'settings',
			accessPropertiesByDotNotation: false,
		}) as unknown as SettingsStore;
	}

	getProviderById(id: string): Provider | undefined {
		const providerId = id.trim().toLowerCase();
		return (this.store.get('providers') ?? []).find(
			(provider) => provider.id.trim().toLowerCase() === providerId
		);
	}

	getAssistantService(): Assistant | undefined {
		return this.store.get('service')?.assistant;
	}
}
