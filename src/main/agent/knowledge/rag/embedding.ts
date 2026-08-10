import type { EmbeddingResult } from '../../../../shared/embedding_types';
import { createEmbedding } from '../../../models/embedding';

export interface EmbeddingInput {
	texts: string[];
	inputType: 'document' | 'query';
	providerId: string;
	modelId: string;
}

export interface EmbeddingProvider {
	embed(input: EmbeddingInput, signal?: AbortSignal): Promise<EmbeddingResult>;
}

export class SelectedEmbeddingProvider implements EmbeddingProvider {
	async embed(input: EmbeddingInput, signal?: AbortSignal): Promise<EmbeddingResult> {
		if (!input.providerId.trim() || !input.modelId.trim()) {
			throw new Error('Select an embedding provider and model before indexing.');
		}
		return createEmbedding({ ...input, requireRemote: true }, signal);
	}
}
