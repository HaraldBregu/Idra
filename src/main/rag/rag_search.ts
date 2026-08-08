import { createEmbedding } from '../models/embedding';
import { DEFAULT_RAG_INDEX_NAME } from '../../shared/rag_types';
import { ragClient } from './rag_client';
import { readRagArtifact } from './rag_artifact';
import { normalizeRagIndexName } from './rag_index_name';
import { readRagManifest } from './rag_manifest';

export interface RagMatch {
	path: string;
	text: string;
	score: number;
}

export async function searchRag(query: string, indexName: string, topK = 5): Promise<RagMatch[]> {
	const selectedIndexName = normalizeRagIndexName(indexName);
	const manifest = readRagManifest();
	if (!manifest) throw new Error('Index the rag folder before searching.');
	if ((manifest.indexName ?? DEFAULT_RAG_INDEX_NAME) !== selectedIndexName) {
		throw new Error('Generate the selected RAG index before searching.');
	}
	if (!manifest.activeNamespace || !manifest.artifactFile) {
		throw new Error('Generate the selected RAG index before searching.');
	}
	const artifact = readRagArtifact(manifest.artifactFile);
	if (
		!artifact ||
		artifact.indexName !== selectedIndexName ||
		artifact.activeNamespace !== manifest.activeNamespace
	) {
		throw new Error('The active RAG artifact is missing or does not match the published index.');
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
		.index(selectedIndexName)
		.namespace(manifest.activeNamespace)
		.query({ vector: embeddings[0], topK, includeMetadata: false });

	const localRecords = new Map(artifact.records.map((record) => [record.id, record]));
	return (result.matches ?? []).flatMap((match) => {
		const record = localRecords.get(match.id);
		return record
			? [{ path: record.metadata.path, text: record.metadata.text, score: match.score ?? 0 }]
			: [];
	});
}
