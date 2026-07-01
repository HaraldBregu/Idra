import type { Provider, ProviderRecord } from '../../shared/providers/types';
import { clearProviders, readProviders, writeProviders } from './providers-store';

export const PROVIDER_SERVICE = 'provider-service';

export type ProviderService = {
	list(): ProviderRecord;
	get(id: string): Provider | undefined;
	has(id: string): boolean;
	set(id: string, provider: Provider): Provider;
	delete(id: string): void;
	clear(): void;
};

export function createProviderService(): ProviderService {
	function list(): ProviderRecord {
		return readProviders();
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
			writeProviders(providers);
			return provider;
		},
		delete(id: string): void {
			const providers = list();
			if (!(id in providers)) return;
			delete providers[id];
			writeProviders(providers);
		},
		clear(): void {
			clearProviders();
		},
	};
}
