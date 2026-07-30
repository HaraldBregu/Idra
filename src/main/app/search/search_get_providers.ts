import type { StoredProvider } from '../../../shared/provider_types';
import { getSearchProviders } from './search_store';

export function getStoredSearchProviders(): StoredProvider[] {
	const stored = getSearchProviders() as unknown;
	if (!Array.isArray(stored)) return [];
	return stored.filter(
		(value): value is StoredProvider =>
			typeof value === 'object' &&
			value !== null &&
			typeof value.id === 'string' &&
			typeof value.name === 'string' &&
			typeof value.apiKey === 'string' &&
			typeof value.baseUrl === 'string'
	);
}
