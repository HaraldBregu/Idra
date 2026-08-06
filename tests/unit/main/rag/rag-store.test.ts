const validate = jest.fn();

jest.mock('node-cron', () => ({
	__esModule: true,
	default: { validate },
}));

import { getRagConfiguration, saveRagConfiguration } from '../../../../src/main/rag/rag_store';

it('defaults, normalizes, and validates the configured RAG index name', () => {
	validate.mockReturnValue(true);
	expect(getRagConfiguration()).toEqual(
		expect.objectContaining({
			indexName: 'friday',
			databaseProviderId: '',
			databaseId: '',
			embeddingProviderId: '',
			embeddingModelId: '',
		})
	);

	expect(
		saveRagConfiguration({
			indexName: ' knowledge-base ',
			databaseProviderId: ' pinecone ',
			databaseId: ' pinecone ',
			embeddingProviderId: ' openai ',
			embeddingModelId: ' text-embedding-3-small ',
			folders: ['/documents'],
			scheduleEnabled: false,
			cronExpression: '0 3 * * *',
		})
	).toEqual(
		expect.objectContaining({
			indexName: 'knowledge-base',
			databaseProviderId: 'pinecone',
			databaseId: 'pinecone',
			embeddingProviderId: 'openai',
			embeddingModelId: 'text-embedding-3-small',
		})
	);

	expect(() =>
		saveRagConfiguration({
			indexName: 'Invalid_Name',
			databaseProviderId: '',
			databaseId: '',
			embeddingProviderId: '',
			embeddingModelId: '',
			folders: [],
			scheduleEnabled: false,
			cronExpression: '0 3 * * *',
		})
	).toThrow('RAG index name must be 1-45 lowercase letters, numbers, or hyphens');
});
