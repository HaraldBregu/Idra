import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ragLocation } from './rag_location';

export interface RagArtifactRecord {
	id: string;
	values: number[];
	metadata: { path: string; text: string };
}

export interface RagArtifact {
	indexName: string;
	activeNamespace: string;
	providerId: string;
	modelId: string;
	dimensions: number;
	records: RagArtifactRecord[];
}

export function readRagArtifact(fileName: string): RagArtifact | undefined {
	if (path.basename(fileName) !== fileName || !/^embeddings-friday-[a-f0-9-]+\.json$/.test(fileName)) {
		return undefined;
	}
	try {
		const artifact = JSON.parse(readFileSync(path.join(ragLocation(), fileName), 'utf8')) as RagArtifact;
		return Array.isArray(artifact.records) ? artifact : undefined;
	} catch {
		return undefined;
	}
}
