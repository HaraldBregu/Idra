const modelGenerate = jest.fn();

jest.mock('../../../../src/main/models/adapters/llm', () => ({
	LlmModel: jest.fn().mockImplementation(() => ({ generate: modelGenerate })),
}));

jest.mock('../../../../src/main/settings_store', () => ({
	getProvider: jest.fn(() => ({ apiKey: 'test-key', baseUrl: 'https://example.test' })),
}));

jest.mock('../../../../src/main/agent/knowledge/wiki/wiki_policy', () => ({
	loadWikiPolicy: jest.fn().mockResolvedValue('Test policy'),
}));

import type { WikiSettings } from '../../../../src/shared/wiki_types';
import {
	generateWikiUpdate,
	WIKI_MAX_OUTPUT_TOKENS,
} from '../../../../src/main/agent/knowledge/wiki/wiki_generate';
import { wikiSourcePage } from '../../../../src/main/agent/knowledge/wiki/wiki_source_page';
import type { WikiSource } from '../../../../src/main/agent/knowledge/wiki/types';

const settings: WikiSettings = {
	enabled: true,
	providerId: 'openai',
	modelId: 'gpt-5',
	sourcePath: '/raw',
	targetPath: '/wiki',
	autoFileAnswers: false,
	requireReviewForMajorChanges: true,
	retrievalPriority: 'wiki_first',
	lintOnStartup: false,
	schedule: { enabled: false, cronExpression: '0 3 * * *' },
};

const source: WikiSource = {
	absolutePath: '/raw/report.md',
	relativePath: 'report.md',
	content: 'A concise source.',
	hash: 'abc123',
	sourceId: 'source-abc123',
};

describe('generateWikiUpdate', () => {
	beforeEach(() => modelGenerate.mockReset());

	it('bounds output size and the number of affected pages', async () => {
		modelGenerate.mockResolvedValue({
			toolCalls: [
				{
					name: 'apply_wiki_update',
					args: {
						pages: [
							{
								path: wikiSourcePage(source),
								title: 'Report',
								summary: 'A report.',
								content: 'Concise compiled content.',
								sources: ['report.md'],
							},
						],
					},
				},
			],
			usage: { inputTokens: 100, outputTokens: 200 },
		});

		await generateWikiUpdate(settings, source, 'Empty wiki');

		const request = modelGenerate.mock.calls[0][0];
		const pagesSchema = request.tools[0].schema.properties.pages;
		expect(request.maxTokens).toBe(WIKI_MAX_OUTPUT_TOKENS);
		expect(request.signal).toBeInstanceOf(AbortSignal);
		expect(pagesSchema.maxItems).toBe(8);
	});

	it('fails with a clear error when the provider exceeds the time limit', async () => {
		modelGenerate.mockImplementation(
			({ signal }: { signal: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					const abort = (): void => reject(new DOMException('Aborted', 'AbortError'));
					if (signal.aborted) abort();
					else signal.addEventListener('abort', abort, { once: true });
				})
		);

		await expect(generateWikiUpdate(settings, source, 'Empty wiki', undefined, 5)).rejects.toThrow(
			'Wiki generation timed out after 1 seconds.'
		);
	});
});
