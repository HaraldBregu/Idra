import type { ProviderEntry } from '../../shared/types';
import type { StoreService } from '../store';

/**
 * ServiceResolver — resolves a configured provider entry (with apiKey) from StoreService.
 *
 * Resolution order (first match wins):
 *   1. Exact match by providerId
 *   2. First configured provider in StoreService
 *
 * Validates that an API key exists for the resolved provider.
 */
export class ServiceResolver {
	constructor(private readonly storeService: StoreService) {}

	/**
	 * Resolve a provider entry from StoreService with fallback chain.
	 *
	 * @param options - Optional providerId override
	 * @returns The resolved provider entry
	 * @throws Error if no providers are configured or no API key is set
	 */
	resolve(options?: { providerId?: string }): ProviderEntry {
		const providerId = options?.providerId?.trim();

		const found = providerId
			? this.storeService.getProviderById(providerId)
			: this.storeService.getProviders()[0];

		if (!found) {
			throw new Error('No providers configured. Please add a provider in the Providers page.');
		}

		const apiKey = found.apiKey.trim();

		if (!apiKey) {
			throw new Error(
				`No API key configured for provider "${found.name}". ` +
					'Please configure the API key in the Providers page.'
			);
		}

		return { ...found, apiKey };
	}
}
