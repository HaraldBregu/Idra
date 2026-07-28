export interface EmbeddingRequest {
	texts: string[];
	inputType?: 'document' | 'query';
	providerId?: string;
	modelId?: string;
}

export interface EmbeddingResult {
	providerId: string;
	modelId: string;
	dimensions: number;
	embeddings: number[][];
}
