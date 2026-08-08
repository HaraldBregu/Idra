const createEmbedding = jest.fn();
const query = jest.fn();
const namespace = jest.fn(() => ({ query }));
const index = jest.fn(() => ({ namespace }));
const ragClient = jest.fn(() => ({ index }));
const readRagManifest = jest.fn();
const readRagArtifact = jest.fn();

jest.mock('../../../../src/main/models/embedding', () => ({ createEmbedding }));
jest.mock('../../../../src/main/rag/rag_client', () => ({ ragClient }));
jest.mock('../../../../src/main/rag/rag_manifest', () => ({ readRagManifest }));
jest.mock('../../../../src/main/rag/rag_artifact', () => ({ readRagArtifact }));

import { searchRag } from '../../../../src/main/rag/rag_search';

beforeEach(() => {
	jest.clearAllMocks();
	index.mockReturnValue({ namespace });
	namespace.mockReturnValue({ query });
	ragClient.mockReturnValue({ index });
	readRagManifest.mockReturnValue({
		indexName: 'knowledge-base',
		activeNamespace: 'friday-a1b2c3d4',
		artifactFile: 'embeddings-friday-a1b2c3d4.json',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		completedAt: '2026-08-08T00:00:00.000Z',
	});
	readRagArtifact.mockReturnValue({
		indexName: 'knowledge-base',
		activeNamespace: 'friday-a1b2c3d4',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		records: [
			{
				id: 'record-one',
				values: [0.1, 0.2],
				metadata: { path: 'documents/guide.md', text: 'Local guide text' },
			},
		],
	});
	createEmbedding.mockResolvedValue({ embeddings: [[0.1, 0.2]] });
	query.mockResolvedValue({ matches: [] });
});

it('queries the active namespace and joins opaque matches to local text', async () => {
	query.mockResolvedValue({ matches: [{ id: 'record-one', score: 0.91 }] });

	await expect(searchRag('query', 'knowledge-base')).resolves.toEqual([
		{ path: 'documents/guide.md', text: 'Local guide text', score: 0.91 },
	]);

	expect(index).toHaveBeenCalledWith('knowledge-base');
	expect(namespace).toHaveBeenCalledWith('friday-a1b2c3d4');
	expect(query).toHaveBeenCalledWith({
		vector: [0.1, 0.2],
		topK: 5,
		includeMetadata: false,
	});
});

it('requires reindexing after the selected index changes', async () => {
	await expect(searchRag('query', 'another-index')).rejects.toThrow(
		'Generate the selected RAG index before searching.'
	);
	expect(createEmbedding).not.toHaveBeenCalled();
});
