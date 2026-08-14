import type { ResolvedProvider, StoredProvider } from './shared/provider_types';
import { SettingsService } from './settings';

export const settingsService = new SettingsService();

export function getProvider(id: string): StoredProvider | undefined {
	const providerId = process.env.IDRA_PROVIDER_ID?.trim();
	const apiKey = process.env.IDRA_API_KEY?.trim();
	if (!providerId || !apiKey || id.trim() !== providerId) return undefined;
	return {
		id: providerId,
		name: providerId,
		apiKey,
		baseUrl: process.env.IDRA_BASE_URL?.trim() ?? '',
	};
}

export function getResolvedProvider(providerId: string | undefined): ResolvedProvider | undefined {
	const provider = providerId ? getProvider(providerId) : undefined;
	if (!provider) return undefined;
	return { id: provider.id, apiKey: provider.apiKey, baseURL: provider.baseUrl };
}
