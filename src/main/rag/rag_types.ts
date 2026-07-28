export const RAG_PROVIDER_IDS = ['openai', 'cohere', 'voyage', 'bge', 'nomic', 'jina'] as const;

export type RagProviderId = (typeof RAG_PROVIDER_IDS)[number];

export interface RagProviderInput {
	apiKey: string;
	baseUrl?: string;
	model?: string;
}

export interface RagSettings {
	providerId: RagProviderId;
	configured: Record<RagProviderId, boolean>;
}

export interface RagConfig {
	providerId: RagProviderId;
	label: string;
	model: string;
	url: string;
	apiKey: string;
	local: boolean;
	inputType?: { field: string; document: string; query: string };
}

export interface EmbedRequest {
	texts: string[];
	inputType?: 'document' | 'query';
}

export interface EmbedResponse {
	providerId: RagProviderId;
	model: string;
	dimensions: number;
	embeddings: number[][];
}
