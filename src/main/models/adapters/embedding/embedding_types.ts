export interface EmbeddingProviderSpec {
	id: string;
	name: string;
	apiKey: string;
	model: string;
	baseURL: string;
}

export interface EmbeddingAdapterRequest {
	texts: string[];
	inputType: 'document' | 'query';
	signal?: AbortSignal;
}

export interface EmbeddingAdapter {
	embed(request: EmbeddingAdapterRequest): Promise<number[][]>;
}
