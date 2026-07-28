export interface EmbeddingProvider {
	name: string;
	model: string;
	baseUrl: string;
	local?: boolean;
}

export const EMBEDDING_PROVIDERS: Record<string, EmbeddingProvider> = {
	openai: {
		name: 'OpenAI',
		model: 'text-embedding-3-large',
		baseUrl: 'https://api.openai.com/v1/embeddings',
	},
	cohere: {
		name: 'Cohere',
		model: 'embed-v4.0',
		baseUrl: 'https://api.cohere.com/v2/embed',
	},
	voyage: {
		name: 'Voyage AI',
		model: 'voyage-3-large',
		baseUrl: 'https://api.voyageai.com/v1/embeddings',
	},
	// ponytail: self-hosted default is a local OpenAI-compatible server (TEI, vLLM, Ollama);
	// override baseUrl in the providers store to point elsewhere.
	bge: {
		name: 'BGE-M3',
		model: 'bge-m3',
		baseUrl: 'http://localhost:8080/v1/embeddings',
		local: true,
	},
	nomic: {
		name: 'Nomic',
		model: 'nomic-embed-text-v2-moe',
		baseUrl: 'https://api-atlas.nomic.ai/v1/embedding/text',
	},
	jina: {
		name: 'Jina',
		model: 'jina-embeddings-v3',
		baseUrl: 'https://api.jina.ai/v1/embeddings',
	},
};

export const EMBEDDING_PROVIDER_IDS = Object.keys(EMBEDDING_PROVIDERS);
