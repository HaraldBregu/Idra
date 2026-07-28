import { getEmbeddingSettings } from './embedding_get_settings';
import { EMBEDDING_PROVIDERS } from './embedding_providers';
import { embeddingStore } from './embedding_store';
import {
	EMBEDDING_PROVIDER_IDS,
	type EmbeddingProviderId,
	type EmbeddingProviderInput,
	type EmbeddingSettings,
} from './embedding_types';

export function saveEmbeddingProvider(
	providerId: EmbeddingProviderId,
	input: EmbeddingProviderInput
): EmbeddingSettings {
	if (!EMBEDDING_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
	const baseUrl = typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : '';
	const model = typeof input?.model === 'string' ? input.model.trim() : '';
	if (!apiKey && !EMBEDDING_PROVIDERS[providerId].local) {
		throw new Error('An embedding provider API key is required.');
	}

	const previousSettings = getEmbeddingSettings();
	const raw = embeddingStore.get('providers') as unknown;
	const providers = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	embeddingStore.set('providers', {
		...providers,
		[providerId]: { apiKey, ...(baseUrl ? { baseUrl } : {}), ...(model ? { model } : {}) },
	});
	if (!previousSettings.configured[previousSettings.providerId]) {
		embeddingStore.set('providerId', providerId);
	}

	return getEmbeddingSettings();
}
