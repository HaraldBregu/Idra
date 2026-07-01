import type { Provider, ProviderRecord } from '../../shared/providers/types';

export type { Provider, ProviderRecord };

export type ProviderService = {
	list(): ProviderRecord;
	get(id: string): Provider | undefined;
	has(id: string): boolean;
	set(id: string, provider: Provider): Provider;
	delete(id: string): void;
	clear(): void;
};
