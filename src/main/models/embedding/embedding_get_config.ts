import { EMBEDDING_PROVIDERS } from './embedding_providers';
import { embeddingStore } from './embedding_store';
import {
	EMBEDDING_PROVIDER_IDS,
	type EmbeddingConfig,
	type EmbeddingProviderId,
} from './embedding_types';

function storedProvider(providerId: EmbeddingProviderId): Record<string, unknown> {
	const raw = embeddingStore.get('providers') as unknown;
	const providers = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const value = providers[providerId];
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function getEmbeddingConfig(providerId: EmbeddingProviderId): EmbeddingConfig {
	if (!EMBEDDING_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	const provider = EMBEDDING_PROVIDERS[providerId];
	const stored = storedProvider(providerId);
	const environmentKey = provider.envKey ? text(process.env[provider.envKey]) : '';

	return {
		providerId,
		label: provider.label,
		model: text(stored.model) || provider.model,
		url: text(stored.baseUrl) || provider.url,
		apiKey: text(stored.apiKey) || environmentKey,
		local: provider.local === true,
		inputType: provider.inputType,
	};
}
