import { Service } from 'typedi';
import type { Provider, ProviderRecord } from '../../shared/providers/types';
import { createProviderStore, readProviders, type ProvidersStore, type ProviderStoreOptions } from './store';

export type ProviderServiceOptions = ProviderStoreOptions;

@Service({ factory: () => new ProviderService() })
export class ProviderService {
	private readonly store: ProvidersStore;

	constructor(options: ProviderServiceOptions = {}) {
		this.store = createProviderStore(options);
	}

	list(): ProviderRecord {
		return readProviders(this.store);
	}

	get(id: string): Provider | undefined {
		return this.list()[id];
	}

	has(id: string): boolean {
		return this.get(id) !== undefined;
	}

	set(id: string, provider: Provider): Provider {
		const providers = this.list();
		providers[id] = provider;
		this.store.store = providers;
		return provider;
	}

	delete(id: string): void {
		const providers = this.list();
		if (!(id in providers)) return;
		delete providers[id];
		this.store.store = providers;
	}

	clear(): void {
		this.store.store = {};
	}
}
