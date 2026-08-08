const getRagConfiguration = jest.fn();
const searchRag = jest.fn();

jest.mock('../../../../../src/main/rag', () => ({
	getRagConfiguration,
	searchRag,
}));

import { knowledgeSearchTool } from '../../../../../src/main/agent/tools/memory/search';
import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/policy/policy_types';

beforeEach(() => {
	jest.clearAllMocks();
	getRagConfiguration.mockReturnValue({ enabled: true, indexName: 'company-knowledge' });
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

	const output = await knowledgeSearchTool.run({ query: ' annual leave policy ', count: 3 });

	expect(knowledgeSearchTool.name).toBe('knowledge_search');
	expect(DEFAULT_PERMISSIONS.knowledge_search).toMatchObject({ default: 'allow' });
	expect(searchRag).toHaveBeenCalledWith('annual leave policy', 'company-knowledge', 3);
	expect(JSON.parse(output as string)).toEqual({ query: 'annual leave policy', results: matches });
});

it('rejects an empty search query before calling RAG', async () => {
	await expect(knowledgeSearchTool.run({ query: '   ' })).rejects.toThrow();
	expect(searchRag).not.toHaveBeenCalled();
});

it('does not search while the Knowledge Base is disabled', async () => {
	getRagConfiguration.mockReturnValue({ enabled: false, indexName: 'company-knowledge' });

	await expect(knowledgeSearchTool.run({ query: 'policy' })).rejects.toThrow(
		'Knowledge Base is disabled.'
	);
	expect(searchRag).not.toHaveBeenCalled();
});

it.each([0, 21, 1.5])('rejects an invalid result count of %s', async (count) => {
	await expect(knowledgeSearchTool.run({ query: 'policy', count })).rejects.toThrow();
	expect(searchRag).not.toHaveBeenCalled();
});
