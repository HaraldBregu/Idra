import { buildEmbeddingAdapter } from './embedding_factory';

export interface GenerateEmbeddingsOptions {
	providerId: string;
	apiKey: string;
	modelId: string;
	baseURL: string;
	texts: string[];
	inputType?: 'document' | 'query';
	signal?: AbortSignal;
}

export async function generateEmbeddings(options: GenerateEmbeddingsOptions): Promise<number[][]> {
	const adapter = buildEmbeddingAdapter({
		id: options.providerId,
		name: options.providerId,
		apiKey: options.apiKey,
		model: options.modelId,
		baseURL: options.baseURL,
	});
	return adapter.embed({
		texts: options.texts,
		inputType: options.inputType ?? 'document',
		signal: options.signal,
	});
}
