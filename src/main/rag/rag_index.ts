import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Pinecone } from '@pinecone-database/pinecone';
import { createEmbedding } from '../app/models/embedding';
import { chunkText } from './rag_chunk';
import { RAG_INDEX_NAME, ragClient } from './rag_client';
import { writeRagManifest } from './rag_manifest';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const BATCH_SIZE = 64;

export interface RagIndexResult {
	files: number;
	vectors: number;
}

export async function indexRag(root: string): Promise<RagIndexResult> {
	const source = root.trim();
	if (!source) throw new Error('Choose a source folder before indexing.');
	if (!(await stat(source)).isDirectory()) throw new Error('The selected source is not a folder.');

	const files = (await readdir(root, { recursive: true })).filter((file) =>
		MARKDOWN_EXTENSIONS.has(path.extname(file).toLowerCase())
	);
	if (files.length === 0) throw new Error(`No Markdown documents to index in ${source}.`);

	const pinecone = ragClient();
	let index: ReturnType<Pinecone['index']> | undefined;
	let vectors = 0;

	for (const file of files) {
		const chunks = chunkText(await readFile(path.join(source, file), 'utf8'));
		for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
			const batch = chunks.slice(start, start + BATCH_SIZE);
			const embedded = await createEmbedding({ texts: batch, inputType: 'document' });
			if (!index) {
				index = await ensureIndex(pinecone, embedded.dimensions);
				writeRagManifest({
					providerId: embedded.providerId,
					modelId: embedded.modelId,
					dimensions: embedded.dimensions,
				});
			}
			await index.upsert({
				records: batch.map((text, offset) => ({
					id: `${file}#${start + offset}`,
					values: embedded.embeddings[offset],
					metadata: { path: file, text },
				})),
			});
			vectors += batch.length;
		}
	}
	if (!index) throw new Error(`No indexable Markdown content found in ${source}.`);
	return { files: files.length, vectors };
}

async function ensureIndex(pinecone: Pinecone, dimension: number) {
	if (dimension === 0) throw new Error('Embedding provider returned no dimensions.');
	// ponytail: indexing re-embeds every file anyway, so rebuild from scratch — drops vectors of
	// deleted files and survives a dimension change. Swap for incremental sync if runs get slow.
	await pinecone.deleteIndex(RAG_INDEX_NAME).catch(() => undefined);
	await pinecone.createIndex({
		name: RAG_INDEX_NAME,
		dimension,
		metric: 'cosine',
		spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
		waitUntilReady: true,
		suppressConflicts: true,
	});
	return pinecone.index(RAG_INDEX_NAME);
}
