import type { ResolvedProvider, StoredProvider } from './shared/provider_types';

export function getProvider(id: string): StoredProvider | undefined {
	const providerId = process.env.FRIDAY_PROVIDER_ID?.trim();
	const apiKey = process.env.FRIDAY_API_KEY?.trim();
	if (!providerId || !apiKey || id.trim() !== providerId) return undefined;
	return {
		id: providerId,
		name: providerId,
		apiKey,
		baseUrl: process.env.FRIDAY_BASE_URL?.trim() ?? '',
	};
}

export function getResolvedProvider(providerId: string | undefined): ResolvedProvider | undefined {
	const provider = providerId ? getProvider(providerId) : undefined;
	if (!provider) return undefined;
	return { id: provider.id, apiKey: provider.apiKey, baseURL: provider.baseUrl };
}
