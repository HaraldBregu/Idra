import type { EmbeddingProvider } from '../../../../src/main/rag/embedding';
import type { VectorStore } from '../../../../src/main/rag/vector_store';
import { searchRag } from '../../../../src/main/rag/rag_search';

const embed = jest.fn();
const embeddings: EmbeddingProvider = { embed };
const getIndex = jest.fn();
const search = jest.fn();
const vectors: VectorStore = {
	getIndex,
	getReusableSource: jest.fn(),
	publish: jest.fn(),
	search,
	close: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
	getIndex.mockReturnValue({
		indexName: 'knowledge-base',
		generation: 'friday-a1b2c3d4',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		completedAt: '2026-08-08T00:00:00.000Z',
	});
	embed.mockResolvedValue({
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		embeddings: [[0.1, 0.2]],
	});
	search.mockReturnValue([
		{
			id: 'record-one',
			sourceId: 'source-one',
			sourceFingerprint: 'fingerprint',
			path: 'documents/guide.md',
			chunkIndex: 0,
			text: 'Local guide text',
			checksum: 'checksum',
			indexedAt: '2026-08-08T00:00:00.000Z',
			vector: [0.1, 0.2],
			score: 0.91,
		},
	]);
});

it('searches SQLite with the exact embedding identity used to build the index', async () => {
	await expect(searchRag('query', 'knowledge-base', 5, { embeddings, vectors })).resolves.toEqual([
		{
			sourceId: 'source-one',
			chunkId: 'record-one',
			path: 'documents/guide.md',
			checksum: 'checksum',
			indexedAt: '2026-08-08T00:00:00.000Z',
			text: 'Local guide text',
			score: 0.91,
		},
	]);
	expect(embed).toHaveBeenCalledWith({
		texts: ['query'],
		inputType: 'query',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
	});
	expect(search).toHaveBeenCalledWith('knowledge-base', [0.1, 0.2], 5);
});

it('requires the selected local index to exist', async () => {
	getIndex.mockReturnValue(undefined);

	await expect(
		searchRag('query', 'another-index', 5, { embeddings, vectors })
	).rejects.toThrow('Index the rag folder before searching.');
	expect(embed).not.toHaveBeenCalled();
});
