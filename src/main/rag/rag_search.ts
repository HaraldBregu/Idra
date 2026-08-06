import { createEmbedding } from '../models/embedding';
import { DEFAULT_RAG_INDEX_NAME } from '../../shared/rag_types';
import { ragClient } from './rag_client';
import { readRagManifest } from './rag_manifest';

export interface RagMatch {
	path: string;
	text: string;
	score: number;
}

export async function searchRag(
	query: string,
	indexName: string,
	topK = 5
): Promise<RagMatch[]> {
	const manifest = readRagManifest();
	if (!manifest) throw new Error('Index the rag folder before searching.');
	if ((manifest.indexName ?? DEFAULT_RAG_INDEX_NAME) !== indexName) {
		throw new Error('Generate the selected RAG index before searching.');
	}

	// Query with the model the index was built with, not whatever is selected now.
	const { embeddings } = await createEmbedding({
		texts: [query],
		inputType: 'query',
		providerId: manifest.providerId,
		modelId: manifest.modelId,
		requireRemote: true,
	});
	const result = await ragClient()
		.index(indexName)
		.query({ vector: embeddings[0], topK, includeMetadata: true });

	return (result.matches ?? []).map((match) => ({
		path: String(match.metadata?.path ?? ''),
		text: String(match.metadata?.text ?? ''),
		score: match.score ?? 0,
	}));
}
