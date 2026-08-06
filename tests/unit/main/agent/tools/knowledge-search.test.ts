const getRagConfiguration = jest.fn();
const searchRag = jest.fn();

jest.mock('../../../../../src/main/rag', () => ({
	getRagConfiguration,
	searchRag,
}));

import { knowledgeSearchTool } from '../../../../../src/main/agent/tools/memory/search';

beforeEach(() => {
	jest.clearAllMocks();
	getRagConfiguration.mockReturnValue({ indexName: 'company-knowledge' });
});

it('searches the configured RAG index and returns its matches', async () => {
	const matches = [
		{
			path: 'handbook/leave.md',
			text: 'Employees receive twenty days of annual leave.',
			score: 0.91,
		},
	];
	searchRag.mockResolvedValue(matches);

	const output = await knowledgeSearchTool.run({ query: ' annual leave policy ' });

	expect(knowledgeSearchTool.name).toBe('knowledge_search');
	expect(knowledgeSearchTool.defaultPermission).toBe('allow');
	expect(searchRag).toHaveBeenCalledWith('annual leave policy', 'company-knowledge');
	expect(JSON.parse(output as string)).toEqual(matches);
});

it('rejects an empty search query before calling RAG', async () => {
	await expect(knowledgeSearchTool.run({ query: '   ' })).rejects.toThrow();
	expect(searchRag).not.toHaveBeenCalled();
});
