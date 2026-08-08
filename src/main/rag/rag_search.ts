import { DEFAULT_RAG_INDEX_NAME } from '../../shared/rag_types';
import { SelectedEmbeddingProvider, type EmbeddingProvider } from './embedding';
import { normalizeRagIndexName } from './rag_index_name';
import { ragVectorStore } from './vector';
import type { VectorStore } from './vector_store';

export interface RagMatch {
	sourceId: string;
	chunkId: string;
	path: string;
	checksum: string;
	indexedAt: string;
	text: string;
	score: number;
}

export interface RagSearchDependencies {
	embeddings?: EmbeddingProvider;
	vectors?: VectorStore;
}

export async function searchRag(
	query: string,
	indexName: string,
	topK = 5,
	dependencies: RagSearchDependencies = {}
): Promise<RagMatch[]> {
	const selectedIndexName = normalizeRagIndexName(indexName);
	const vectorStore = dependencies.vectors ?? ragVectorStore();
	const embeddingProvider = dependencies.embeddings ?? new SelectedEmbeddingProvider();

	try {
		const index = vectorStore.getIndex(selectedIndexName);
		if (!index) throw new Error('Index the rag folder before searching.');
		if ((index.indexName ?? DEFAULT_RAG_INDEX_NAME) !== selectedIndexName) {
			throw new Error('Generate the selected RAG index before searching.');
		}

		const embedded = await embeddingProvider.embed({
			texts: [query],
			inputType: 'query',
			providerId: index.providerId,
			modelId: index.modelId,
		});
		if (embedded.providerId !== index.providerId || embedded.modelId !== index.modelId) {
			throw new Error('Embedding provider did not use the indexed provider and model.');
		}

		return vectorStore.search(selectedIndexName, embedded.embeddings[0], topK).map((match) => ({
			sourceId: match.sourceId,
			chunkId: match.id,
			path: match.path,
			checksum: match.checksum,
			indexedAt: match.indexedAt,
			text: match.text,
			score: match.score,
		}));
	} finally {
		if (!dependencies.vectors) vectorStore.close();
	}
}
