import type { EmbeddingRequest, EmbeddingResult } from '../../../shared/embedding_types';
import { generateEmbeddings } from '../adapters/embedding';
import { defaultProviderId, providerModels } from '../../models';
import { getProvider } from '../../settings_store';
import { getModelId, getProviderId } from '../models_store';
import { EMBEDDING_PROVIDERS } from './embedding_providers';

export async function createEmbedding(
	request: EmbeddingRequest,
	signal?: AbortSignal
): Promise<EmbeddingResult> {
	const texts = (request.texts ?? []).map((text) => text?.trim()).filter(Boolean);
	if (texts.length === 0) throw new Error('Text to embed is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getProviderId('embedding') ?? defaultProviderId('embedding') ?? ''
	);
	const provider = EMBEDDING_PROVIDERS[providerId];
	if (request.requireRemote && provider.local) {
		throw new Error('A remote embedding provider is required.');
	}
	const modelId = resolveModelId(providerId, request.modelId ?? getModelId('embedding'));
	const apiKey = getProvider(providerId)?.apiKey.trim() ?? '';
	if (!apiKey && !provider.local) {
		throw new Error(`${provider.name} API key not configured.`);
	}

	const embeddings = await generateEmbeddings({
		providerId,
		apiKey,
		modelId,
		// ponytail: self-hosted endpoint moves via BGE_BASE_URL; no settings field until asked.
		baseURL: (provider.local && process.env.BGE_BASE_URL?.trim()) || provider.url,
		texts,
		inputType: request.inputType,
		signal,
	});
	const dimensions = embeddings[0]?.length ?? 0;
	if (embeddings.length !== texts.length || embeddings.some((v) => v?.length !== dimensions)) {
		throw new Error(`${provider.name} returned malformed embeddings.`);
	}
	return { providerId, modelId, dimensions, embeddings };
}

function resolveProviderId(providerId: string): string {
	if (!EMBEDDING_PROVIDERS[providerId]) {
		throw new Error(`Embedding provider is not supported: ${providerId}`);
	}
	return providerId;
}

function resolveModelId(providerId: string, modelId: string | undefined): string {
	if (modelId?.trim()) return modelId.trim();
	const fallback = providerModels(providerId, 'embedding')[0]?.id;
	if (!fallback) throw new Error(`No embedding models available for provider: ${providerId}`);
	return fallback;
}
