import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { userDataLocation } from '../shared/user_data_location';

export interface RagManifest {
	indexName?: string;
	providerId: string;
	modelId: string;
	dimensions: number;
}

// ponytail: sibling of the rag folder, not inside it, so indexing never reads it back as a document.
function manifestPath(): string {
	return path.join(userDataLocation(), 'rag.json');
}

export function readRagManifest(): RagManifest | undefined {
	try {
		return JSON.parse(readFileSync(manifestPath(), 'utf8')) as RagManifest;
	} catch {
		return undefined;
	}
}

export function writeRagManifest(manifest: RagManifest): void {
	writeFileSync(manifestPath(), JSON.stringify(manifest), 'utf8');
}
