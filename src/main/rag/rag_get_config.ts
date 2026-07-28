import { RAG_PROVIDERS } from './rag_providers';
import { ragStore } from './rag_store';
import { RAG_PROVIDER_IDS, type RagConfig, type RagProviderId } from './rag_types';

function storedProvider(providerId: RagProviderId): Record<string, unknown> {
	const raw = ragStore.get('providers') as unknown;
	const providers = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const value = providers[providerId];
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function getRagConfig(providerId: RagProviderId): RagConfig {
	if (!RAG_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	const provider = RAG_PROVIDERS[providerId];
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
