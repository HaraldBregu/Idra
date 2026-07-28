export const EMBEDDING_PROVIDER_IDS = [
	'openai',
	'cohere',
	'voyage',
	'bge',
	'nomic',
	'jina',
] as const;

export type EmbeddingProviderId = (typeof EMBEDDING_PROVIDER_IDS)[number];

export interface EmbeddingProviderInput {
	apiKey: string;
	baseUrl?: string;
	model?: string;
}

export interface EmbeddingSettings {
	providerId: EmbeddingProviderId;
	configured: Record<EmbeddingProviderId, boolean>;
}

export interface EmbeddingConfig {
	providerId: EmbeddingProviderId;
	label: string;
	model: string;
	url: string;
	apiKey: string;
	local: boolean;
	inputType?: { field: string; document: string; query: string };
}

export interface EmbeddingRequest {
	texts: string[];
	inputType?: 'document' | 'query';
}

export interface EmbeddingResult {
	providerId: EmbeddingProviderId;
	model: string;
	dimensions: number;
	embeddings: number[][];
}
