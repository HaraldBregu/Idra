import type { Provider, ProviderRecord } from '../../shared/providers/types';
import { createProviderStore, readProviders, type ProviderStoreOptions } from './store';

export const PROVIDER_SERVICE = 'provider-service';

export type ProviderServiceOptions = ProviderStoreOptions;

export type ProviderService = {
	list(): ProviderRecord;
	get(id: string): Provider | undefined;
	has(id: string): boolean;
	set(id: string, provider: Provider): Provider;
	delete(id: string): void;
	clear(): void;
};

export function createProviderService(options: ProviderServiceOptions = {}): ProviderService {
	const store = createProviderStore(options);

	function list(): ProviderRecord {
		return readProviders(store);
	}

	return {
		list,
		get(id: string): Provider | undefined {
			return list()[id];
		},
		has(id: string): boolean {
			return list()[id] !== undefined;
		},
		set(id: string, provider: Provider): Provider {
			const providers = list();
			providers[id] = provider;
			store.store = providers;
			return provider;
		},
		delete(id: string): void {
			const providers = list();
			if (!(id in providers)) return;
			delete providers[id];
			store.store = providers;
		},
		clear(): void {
			store.store = {};
		},
	};
}
