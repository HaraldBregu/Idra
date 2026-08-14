import path from 'node:path';
import { ragLocation } from './rag_location';
import { SqliteVectorStore } from './sqlite';
import type { VectorStore } from './types';

export function ragVectorStore(): VectorStore {
	return new SqliteVectorStore(path.join(ragLocation(), 'vectors.sqlite'));
}
