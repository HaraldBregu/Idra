export interface EmbeddingRequest {
	texts: string[];
	inputType?: 'document' | 'query';
	providerId?: string;
	modelId?: string;
	requireRemote?: boolean;
}

export interface EmbeddingResult {
	providerId: string;
	modelId: string;
	dimensions: number;
	embeddings: number[][];
}
