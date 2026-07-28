import { createEmbedding } from '../models/embedding';
import { RAG_INDEX_NAME, ragClient } from './rag_client';

export interface RagMatch {
	path: string;
	text: string;
	score: number;
}

export async function searchRag(query: string, topK = 5): Promise<RagMatch[]> {
	const { embeddings } = await createEmbedding({ texts: [query], inputType: 'query' });
	const result = await ragClient()
		.index(RAG_INDEX_NAME)
		.query({ vector: embeddings[0], topK, includeMetadata: true });

	return (result.matches ?? []).map((match) => ({
		path: String(match.metadata?.path ?? ''),
		text: String(match.metadata?.text ?? ''),
		score: match.score ?? 0,
	}));
}
