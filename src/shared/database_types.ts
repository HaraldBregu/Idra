import type { StoredProvider } from './provider_types';

export interface DatabaseConfiguration {
	providerId: string | undefined;
	databaseId: string | undefined;
	providers: StoredProvider[];
}
