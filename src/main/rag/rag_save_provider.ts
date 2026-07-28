import { getRagSettings } from './rag_get_settings';
import { RAG_PROVIDERS } from './rag_providers';
import { ragStore } from './rag_store';
import {
	RAG_PROVIDER_IDS,
	type RagProviderId,
	type RagProviderInput,
	type RagSettings,
} from './rag_types';

export function saveRagProvider(
	providerId: RagProviderId,
	input: RagProviderInput
): RagSettings {
	if (!RAG_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	const apiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
	const baseUrl = typeof input?.baseUrl === 'string' ? input.baseUrl.trim() : '';
	const model = typeof input?.model === 'string' ? input.model.trim() : '';
	if (!apiKey && !RAG_PROVIDERS[providerId].local) {
		throw new Error('An embedding provider API key is required.');
	}

	const previousSettings = getRagSettings();
	const raw = ragStore.get('providers') as unknown;
	const providers = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	ragStore.set('providers', {
		...providers,
		[providerId]: { apiKey, ...(baseUrl ? { baseUrl } : {}), ...(model ? { model } : {}) },
	});
	if (!previousSettings.configured[previousSettings.providerId]) {
		ragStore.set('providerId', providerId);
	}

	return getRagSettings();
}
