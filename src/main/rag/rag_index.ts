import { appendFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pinecone } from '@pinecone-database/pinecone';
import { createEmbedding } from '../models/embedding';
import { chunkText } from './rag_chunk';
import { ragClient } from './rag_client';
import { normalizeRagIndexName } from './rag_index_name';
import { ragLocation } from './rag_location';
import { collectRagSources } from './source';
import { writeRagManifest } from './rag_manifest';

const BATCH_SIZE = 64;

export interface RagIndexResult {
	files: number;
	vectors: number;
}

export async function indexRag(
	folders: readonly string[],
	indexName: string
): Promise<RagIndexResult> {
	const selectedIndexName = normalizeRagIndexName(indexName);
	const sources = [...new Set(folders.map((folder) => folder.trim()).filter(Boolean))];
	if (sources.length === 0) throw new Error('Choose at least one source folder before indexing.');

	const outputDirectory = ragLocation();
	const outputFile = path.join(outputDirectory, 'embeddings.json');
	const temporaryOutputFile = `${outputFile}.tmp`;
	const pinecone = ragClient();
	let index: ReturnType<Pinecone['index']> | undefined;
	let vectors = 0;
	let indexedFiles = 0;

	try {
		for await (const { source, sourceIndex, file, content } of collectRagSources(sources)) {
			const chunks = chunkText(content);
			if (chunks.length > 0) indexedFiles += 1;
			for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
				const batch = chunks.slice(start, start + BATCH_SIZE);
				const embedded = await createEmbedding({
					texts: batch,
					inputType: 'document',
					requireRemote: true,
				});
				if (!index) {
					index = await ensureIndex(pinecone, selectedIndexName, embedded.dimensions);
					writeRagManifest({
						indexName: selectedIndexName,
						providerId: embedded.providerId,
						modelId: embedded.modelId,
						dimensions: embedded.dimensions,
					});
					await mkdir(outputDirectory, { recursive: true });
					const metadata = JSON.stringify({
						indexName: selectedIndexName,
						providerId: embedded.providerId,
						modelId: embedded.modelId,
						dimensions: embedded.dimensions,
					});
					await writeFile(temporaryOutputFile, `${metadata.slice(0, -1)},"records":[`, 'utf8');
				}
				const records = batch.map((text, offset) => ({
					id: `${sourceIndex}:${file}#${start + offset}`,
					values: embedded.embeddings[offset],
					metadata: { path: path.join(path.basename(source), file), text },
				}));
				await index.upsert({ records });
				await appendFile(
					temporaryOutputFile,
					`${vectors > 0 ? ',' : ''}${records.map((record) => JSON.stringify(record)).join(',')}`,
					'utf8'
				);
				vectors += batch.length;
			}
		}
		if (!index) throw new Error('No indexable text content found in the selected source folders.');
		await appendFile(temporaryOutputFile, ']}\n', 'utf8');
		await rename(temporaryOutputFile, outputFile);
		return { files: indexedFiles, vectors };
	} finally {
		await rm(temporaryOutputFile, { force: true }).catch(() => undefined);
	}
}

async function ensureIndex(pinecone: Pinecone, indexName: string, dimension: number) {
	if (dimension === 0) throw new Error('Embedding provider returned no dimensions.');
	// ponytail: indexing re-embeds every file anyway, so rebuild from scratch — drops vectors of
	// deleted files and survives a dimension change. Swap for incremental sync if runs get slow.
	await pinecone.deleteIndex(indexName).catch(() => undefined);
	await pinecone.createIndex({
		name: indexName,
		dimension,
		metric: 'cosine',
		spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
		waitUntilReady: true,
		suppressConflicts: true,
	});
	return pinecone.index(indexName);
}
