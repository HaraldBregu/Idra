import type { EmbeddingProviderId } from './embedding_types';

export interface EmbeddingProvider {
	label: string;
	model: string;
	url: string;
	envKey?: string;
	local?: boolean;
	inputType?: { field: string; document: string; query: string };
}

export const EMBEDDING_PROVIDERS: Record<EmbeddingProviderId, EmbeddingProvider> = {
	openai: {
		label: 'OpenAI',
		model: 'text-embedding-3-large',
		url: 'https://api.openai.com/v1/embeddings',
		envKey: 'OPENAI_API_KEY',
	},
	cohere: {
		label: 'Cohere',
		model: 'embed-v4.0',
		url: 'https://api.cohere.com/v2/embed',
		envKey: 'COHERE_API_KEY',
	},
	voyage: {
		label: 'Voyage AI',
		model: 'voyage-3-large',
		url: 'https://api.voyageai.com/v1/embeddings',
		envKey: 'VOYAGE_API_KEY',
		inputType: { field: 'input_type', document: 'document', query: 'query' },
	},
	// ponytail: self-hosted default is a local OpenAI-compatible server (TEI, vLLM, Ollama);
	// point it elsewhere with baseUrl in settings.json.
	bge: {
		label: 'BGE-M3',
		model: 'bge-m3',
		url: 'http://localhost:8080/v1/embeddings',
		local: true,
	},
	nomic: {
		label: 'Nomic',
		model: 'nomic-embed-text-v2-moe',
		url: 'https://api-atlas.nomic.ai/v1/embedding/text',
		envKey: 'NOMIC_API_KEY',
	},
	jina: {
		label: 'Jina',
		model: 'jina-embeddings-v3',
		url: 'https://api.jina.ai/v1/embeddings',
		envKey: 'JINA_API_KEY',
		inputType: { field: 'task', document: 'retrieval.passage', query: 'retrieval.query' },
	},
};
