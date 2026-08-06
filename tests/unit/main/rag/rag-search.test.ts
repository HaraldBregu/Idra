const createEmbedding = jest.fn();
const query = jest.fn();
const index = jest.fn(() => ({ query }));
const ragClient = jest.fn(() => ({ index }));
const readRagManifest = jest.fn();

jest.mock('../../../../src/main/models/embedding', () => ({ createEmbedding }));
jest.mock('../../../../src/main/rag/rag_client', () => ({ ragClient }));
jest.mock('../../../../src/main/rag/rag_manifest', () => ({ readRagManifest }));

import { searchRag } from '../../../../src/main/rag/rag_search';

beforeEach(() => {
	jest.clearAllMocks();
	index.mockReturnValue({ query });
	ragClient.mockReturnValue({ index });
	readRagManifest.mockReturnValue({
		indexName: 'knowledge-base',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
	});
	createEmbedding.mockResolvedValue({ embeddings: [[0.1, 0.2]] });
	query.mockResolvedValue({ matches: [] });
});

it('queries the configured index name', async () => {
	await searchRag('query', 'knowledge-base');

	expect(index).toHaveBeenCalledWith('knowledge-base');
});

it('requires reindexing after the selected index changes', async () => {
	await expect(searchRag('query', 'another-index')).rejects.toThrow(
		'Generate the selected RAG index before searching.'
	);
	expect(createEmbedding).not.toHaveBeenCalled();
});
