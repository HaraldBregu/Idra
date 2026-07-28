import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type { Pinecone } from '@pinecone-database/pinecone';
import { createEmbedding } from '../models/embedding';
import { chunkText } from './rag_chunk';
import { RAG_INDEX_NAME, ragClient } from './rag_client';
import { ragLocation } from './rag_location';

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.log']);
const BATCH_SIZE = 64;

export async function indexRag(): Promise<{ files: number; vectors: number }> {
	const root = ragLocation();
	const files = (await readdir(root, { recursive: true })).filter((file) =>
		TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())
	);
	if (files.length === 0) throw new Error(`No documents to index in ${root}.`);

	const pinecone = ragClient();
	let index: ReturnType<Pinecone['index']> | undefined;
	let vectors = 0;

	for (const file of files) {
		const chunks = chunkText(await readFile(path.join(root, file), 'utf8'));
		for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
			const batch = chunks.slice(start, start + BATCH_SIZE);
			const embedded = await createEmbedding({ texts: batch, inputType: 'document' });
			index ??= await ensureIndex(pinecone, embedded.dimensions);
			await index.upsert(
				batch.map((text, offset) => ({
					id: `${file}#${start + offset}`,
					values: embedded.embeddings[offset],
					metadata: { path: file, text },
				}))
			);
			vectors += batch.length;
		}
	}
	// ponytail: upsert only — vectors of deleted files stay until someone asks for pruning.
	return { files: files.length, vectors };
}

async function ensureIndex(pinecone: Pinecone, dimension: number) {
	if (dimension === 0) throw new Error('Embedding provider returned no dimensions.');
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
