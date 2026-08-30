import type { ResolvedProvider, StoredProvider } from '../shared/provider_types';
import { providerBaseUrl } from '../provider/base';
import { readProvider } from '../provider/read';
import { PROVIDERS, type ProviderId } from '../provider/types';
import { userDataLocation } from '../shared/user_data_location';
import { configuredProvider } from '../config/provider';

export function getProvider(id: string): StoredProvider | undefined {
	const configured = configuredProvider();
	if (configured && id.trim() === configured.provider) {
		return {
			id: configured.provider,
			name: configured.provider,
			apiKey: configured.apiKey,
			baseUrl: providerBaseUrl(configured.provider),
		};
	}
	const providerId = process.env.IDRA_PROVIDER_ID?.trim();
	const apiKey = process.env.IDRA_API_KEY?.trim();
	if (providerId && apiKey && id.trim() === providerId) {
		return {
			id: providerId,
			name: providerId,
			apiKey,
			baseUrl:
				process.env.IDRA_BASE_URL?.trim() ||
				(PROVIDERS.includes(providerId as ProviderId)
					? providerBaseUrl(providerId as ProviderId)
					: ''),
		};
	}
	const stored = readProvider(userDataLocation());
	if (!stored || id.trim() !== stored.provider) return undefined;
	return {
		id: stored.provider,
		name: stored.provider,
		apiKey: stored.apiKey,
		baseUrl: providerBaseUrl(stored.provider),
	};
}

export function getResolvedProvider(providerId: string | undefined): ResolvedProvider | undefined {
	const provider = providerId ? getProvider(providerId) : undefined;
	if (!provider) return undefined;
	return { id: provider.id, apiKey: provider.apiKey, baseURL: provider.baseUrl };
}
