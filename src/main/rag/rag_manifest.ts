import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ragLocation } from './rag_location';

export interface RagManifest {
	indexName?: string;
	providerId: string;
	modelId: string;
	dimensions: number;
}

function manifestPath(): string {
	return path.join(ragLocation(), 'index.json');
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
