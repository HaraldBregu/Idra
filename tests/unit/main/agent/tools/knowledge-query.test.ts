const getRagConfiguration = jest.fn();
const searchRag = jest.fn();
const getWikiSettings = jest.fn();
const buildWikiAnswerContext = jest.fn();

jest.mock('../../../../../src/main/rag', () => ({ getRagConfiguration, searchRag }));
jest.mock('../../../../../src/main/wiki/wiki_get_settings', () => ({ getWikiSettings }));
jest.mock('../../../../../src/main/wiki/wiki_answer_context', () => ({
	buildWikiAnswerContext,
}));

import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/policy/policy_types';
import { getKnowledgeTools } from '../../../../../src/main/agent/tools/knowledge';
import { knowledgeQueryTool } from '../../../../../src/main/agent/tools/knowledge/query';

beforeEach(() => {
	jest.clearAllMocks();
	getWikiSettings.mockReturnValue({ enabled: true });
	getRagConfiguration.mockReturnValue({ enabled: true, indexName: 'company-knowledge' });
	buildWikiAnswerContext.mockResolvedValue({
		query: 'leave',
		compiledWiki: [
			{
				pageId: 'leave',
				path: 'leave.md',
				confidence: 0.9,
				content: 'Employees receive twenty days of annual leave.',
			},
		],
		primaryEvidence: [],
		contradictions: [],
		limitations: [],
	});
});

it('exposes one main-session knowledge broker and prefers confident compiled wiki evidence', async () => {
	const controller = new AbortController();
	const output = JSON.parse(
		(await knowledgeQueryTool.run({ query: ' leave ' }, controller.signal)) as string
	);

	expect(getKnowledgeTools('main').map((tool) => tool.name)).toEqual(['knowledge_query']);
	expect(getKnowledgeTools('task').map((tool) => tool.name)).toEqual(['knowledge_query']);
	expect(getKnowledgeTools('bot')).toEqual([]);
	expect(DEFAULT_PERMISSIONS.knowledge_query).toMatchObject({ default: 'allow' });
	expect(buildWikiAnswerContext).toHaveBeenCalledWith(
		'leave',
		false,
		undefined,
		controller.signal
	);
	expect(searchRag).not.toHaveBeenCalled();
	expect(output).toMatchObject({ route: 'compiled_wiki', abstain: false });
	expect(output.results[0]).toMatchObject({
		kind: 'compiled_wiki',
		sourceId: 'leave',
		chunkId: 'wiki:leave',
		path: 'leave.md',
		status: 'active',
	});
});

it('falls back to the configured local index when wiki confidence is low', async () => {
	const controller = new AbortController();
	buildWikiAnswerContext.mockResolvedValue({
		query: 'leave',
		compiledWiki: [],
		primaryEvidence: [],
		contradictions: [],
		limitations: ['No compiled wiki page matched the query.'],
	});
	searchRag.mockResolvedValue([
		{
			sourceId: 'source-1',
			chunkId: 'source-1#0',
			path: 'handbook/leave.md',
			lineStart: 4,
			lineEnd: 4,
			checksum: 'checksum-1',
			indexedAt: '2026-08-08T00:00:00.000Z',
			text: 'Twenty days.',
			score: 0.91,
		},
	]);

	const output = JSON.parse(
		(await knowledgeQueryTool.run({ query: 'leave', count: 3 }, controller.signal)) as string
	);

	expect(searchRag).toHaveBeenCalledWith('leave', 'company-knowledge', 3, {
		signal: controller.signal,
	});
	expect(output.route).toBe('wiki_then_local_rag');
	expect(output.results[0]).toMatchObject({
		kind: 'local_rag',
		sourceId: 'source-1',
		chunkId: 'source-1#0',
		range: { lineStart: 4, lineEnd: 4 },
		status: 'indexed',
	});
});

it('abstains when exact evidence cannot be verified', async () => {
	getRagConfiguration.mockReturnValue({ enabled: false, indexName: 'company-knowledge' });
	buildWikiAnswerContext.mockResolvedValue({
		query: 'quote',
		compiledWiki: [],
		primaryEvidence: [],
		contradictions: [],
		limitations: [],
	});

	const output = JSON.parse((await knowledgeQueryTool.run({ query: 'quote', exact: true })) as string);

	expect(output.abstain).toBe(true);
	expect(output.route).toBe('abstain');
	expect(output.limitations).toContain(
		'The local knowledge index is disabled, so no RAG fallback was available.'
	);
});
