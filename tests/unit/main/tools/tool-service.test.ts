import { ToolService } from '../../../../src/main/tools/service';
import type { AgentTool } from '../../../../src/main/tools/types';
import { makeToolContext } from '../test-helpers';

describe('ToolService', () => {
	it('prepares provider-safe tools and management through one service facade', () => {
		const service = new ToolService();
		const tool: AgentTool = {
			name: 'Bad Tool!',
			description: 'Unsafe provider name.',
			schema: {
				type: 'object',
				properties: { value: { type: 'string' } },
				patternProperties: { '^x-': { type: 'string' } },
			},
			execute: jest.fn(),
		};

		const prepared = service.prepareToolsForRun({
			tools: [tool],
			ctx: makeToolContext(),
			userMessage: 'use it',
			provider: 'openai',
			modelId: 'gpt-test',
			management: { maxPromptTools: 1 },
		});

		expect(prepared.toolsForPrompt).toHaveLength(1);
		expect(prepared.toolsForPrompt[0]).toMatchObject({
			name: 'bad_tool',
			description: expect.stringContaining('Provider-safe alias for Bad Tool!'),
			schema: {
				type: 'object',
				properties: { value: { type: 'string' } },
				required: [],
			},
		});
		expect(prepared.management.executor).toBeDefined();
	});

	it('creates default connector tools and applies deny policy', () => {
		const service = new ToolService();
		const allowed: AgentTool = {
			name: 'calendar_list',
			description: 'List calendar entries.',
			schema: { type: 'object' },
			execute: jest.fn(),
		};
		const denied: AgentTool = {
			name: 'mail_send',
			description: 'Send mail.',
			schema: { type: 'object' },
			execute: jest.fn(),
		};

		const tools = service.createDefaultTools({
			connectors: { createAgentTools: () => [allowed, denied] },
			denylist: ['mail_send'],
		});

		expect(tools).toEqual([allowed]);
	});
});
