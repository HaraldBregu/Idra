export interface VectorIndex {
	indexName: string;
	generation: string;
	providerId: string;
	modelId: string;
	dimensions: number;
	completedAt: string;
}

export interface VectorRecord {
	id: string;
	sourceId: string;
	sourceFingerprint: string;
	path: string;
	chunkIndex: number;
	lineStart: number;
	lineEnd: number;
	text: string;
	checksum: string;
	indexedAt: string;
	vector: number[];
}

export interface VectorMatch extends VectorRecord {
	score: number;
}

export interface VectorPublication extends VectorIndex {
	records: readonly VectorRecord[];
}

export interface VectorStore {
	getIndex(indexName: string): VectorIndex | undefined;
	getReusableSource(
		indexName: string,
		sourceId: string,
		sourceFingerprint: string,
		providerId: string,
		modelId: string
	): VectorRecord[] | undefined;
	publish(publication: VectorPublication): void;
	search(indexName: string, vector: readonly number[], topK: number): VectorMatch[];
	exportIndex(indexName: string, generation?: string): VectorPublication | undefined;
	purge(indexName: string, generation?: string): { records: number; indexRemoved: boolean };
	close(): void;
}
