import { SqliteVectorStore } from '../../../../src/main/rag/sqlite';
import type { VectorPublication } from '../../../../src/main/rag/vector_store';

const publication: VectorPublication = {
	indexName: 'knowledge-base',
	generation: 'friday-first',
	providerId: 'openai',
	modelId: 'text-embedding-3-small',
	dimensions: 2,
	completedAt: '2026-08-08T00:00:00.000Z',
	records: [
		{
			id: 'guide#0',
			sourceId: 'guide',
			sourceFingerprint: 'fingerprint',
			path: 'documents/guide.md',
			chunkIndex: 0,
			lineStart: 1,
			lineEnd: 1,
			text: 'Local guide',
			checksum: 'checksum-guide',
			indexedAt: '2026-08-08T00:00:00.000Z',
			vector: [1, 0],
		},
		{
			id: 'notes#0',
			sourceId: 'notes',
			sourceFingerprint: 'fingerprint-notes',
			path: 'documents/notes.md',
			chunkIndex: 0,
			lineStart: 3,
			lineEnd: 3,
			text: 'Local notes',
			checksum: 'checksum-notes',
			indexedAt: '2026-08-08T00:00:00.000Z',
			vector: [0, 1],
		},
	],
};

it('stores Float32 vectors, reuses source fingerprints, and performs exact cosine search', () => {
	const store = new SqliteVectorStore(':memory:');
	try {
		store.publish(publication);

		expect(store.getIndex('knowledge-base')).toEqual({
			indexName: 'knowledge-base',
			generation: 'friday-first',
			providerId: 'openai',
			modelId: 'text-embedding-3-small',
			dimensions: 2,
			completedAt: '2026-08-08T00:00:00.000Z',
		});
		expect(
			store.getReusableSource(
				'knowledge-base',
				'guide',
				'fingerprint',
				'openai',
				'text-embedding-3-small'
			)
		).toEqual([expect.objectContaining({ id: 'guide#0', vector: [1, 0] })]);
		expect(
			store.getReusableSource(
				'knowledge-base',
				'guide',
				'fingerprint',
				'openai',
				'another-model'
			)
		).toBeUndefined();
		expect(store.search('knowledge-base', [0.9, 0.1], 1)).toEqual([
			expect.objectContaining({ id: 'guide#0', score: expect.any(Number) }),
		]);
	} finally {
		store.close();
	}
});

it('keeps the previous generation active when publication fails', () => {
	const store = new SqliteVectorStore(':memory:');
	try {
		store.publish(publication);
		expect(() =>
			store.publish({
				...publication,
				generation: 'friday-failed',
				records: [publication.records[0], publication.records[0]],
			})
		).toThrow();

		expect(store.getIndex('knowledge-base')?.generation).toBe('friday-first');
		expect(store.search('knowledge-base', [1, 0], 5)).toHaveLength(2);
	} finally {
		store.close();
	}
});
