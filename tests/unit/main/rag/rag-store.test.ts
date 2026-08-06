const validate = jest.fn();

jest.mock('node-cron', () => ({
	__esModule: true,
	default: { validate },
}));

import { getRagConfiguration, saveRagConfiguration } from '../../../../src/main/rag/rag_store';

it('defaults, normalizes, and validates the configured RAG index name', () => {
	validate.mockReturnValue(true);
	expect(getRagConfiguration().indexName).toBe('friday');

	expect(
		saveRagConfiguration({
			indexName: ' knowledge-base ',
			folders: ['/documents'],
			scheduleEnabled: false,
			cronExpression: '0 3 * * *',
		}).indexName
	).toBe('knowledge-base');

	expect(() =>
		saveRagConfiguration({
			indexName: 'Invalid_Name',
			folders: [],
			scheduleEnabled: false,
			cronExpression: '0 3 * * *',
		})
	).toThrow('RAG index name must be 1-45 lowercase letters, numbers, or hyphens');
});
