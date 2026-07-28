import type { EmbeddingRequest, EmbeddingResult } from '../../../shared/embedding_types';
import { generateEmbeddings } from '../../app/models_adapters/embedding';
import { getProvider } from '../../providers';
import { getModelId, getProviderId } from '../models_store';
import { EMBEDDING_PROVIDERS } from './embedding_providers';

const DEFAULT_EMBEDDING_PROVIDER_ID = 'openai';

export async function createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
	const texts = (request.texts ?? []).map((text) => text?.trim()).filter(Boolean);
	if (texts.length === 0) throw new Error('Text to embed is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getProviderId('embedding') ?? DEFAULT_EMBEDDING_PROVIDER_ID
	);
	const provider = EMBEDDING_PROVIDERS[providerId];
	const stored = getProvider(providerId);
	const modelId = request.modelId?.trim() || getModelId('embedding') || provider.model;
	const apiKey = stored?.apiKey.trim() ?? '';
	if (!apiKey && !provider.local) {
		throw new Error(`${provider.name} API key not configured.`);
	}

	const embeddings = await generateEmbeddings({
		providerId,
		apiKey,
		modelId,
		baseURL: stored?.baseUrl.trim() || provider.baseUrl,
		texts,
		inputType: request.inputType,
	});
	return { providerId, modelId, dimensions: embeddings[0]?.length ?? 0, embeddings };
}

function resolveProviderId(providerId: string): string {
	if (!EMBEDDING_PROVIDERS[providerId]) {
		throw new Error(`Embedding provider is not supported: ${providerId}`);
	}
	return providerId;
}
