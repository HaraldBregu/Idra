import { Pinecone } from '@pinecone-database/pinecone';
import { getProvider } from '../settings_store';

// ponytail: one index for the whole rag folder; no per-collection naming until asked.
export const RAG_INDEX_NAME = 'friday';

export function ragClient(): Pinecone {
	const apiKey = getProvider('pinecone')?.apiKey.trim() ?? '';
	if (!apiKey) throw new Error('Pinecone API key not configured.');
	return new Pinecone({ apiKey });
}
