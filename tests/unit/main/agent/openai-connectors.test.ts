import path from 'node:path';
import { AgentService, type AgentServiceDependencies } from '../../../../src/main/agent';
import type { AgentRunInput } from '../../../../src/main/agent/execution';
import type { ProviderAdapter } from '../../../../src/main/llm/types';

function dependencies(providerId: string, connectors: unknown): AgentServiceDependencies {
	return {
		store: {
			getAgentService: () => ({
				provider: { id: providerId },
				model: { id: providerId === 'openai' ? 'gpt-5.4' : 'claude-sonnet-4-5', name: 'model' },
			}),
			getProviderById: () => ({ apiKey: 'provider-key' }),
		} as never,
		cron: {} as never,
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as never,
		eventBus: {
			broadcast: jest.fn(),
			emit: jest.fn(),
			on: jest.fn(() => jest.fn()),
		} as never,
		workspace: {
			getRootPath: () => process.cwd(),
		} as never,
		connectors: connectors as never,
	};
}

function service(providerId: string, connectors: unknown, execute: jest.Mock) {
	return new AgentService(dependencies(providerId, connectors), {
		sessionBaseDir: path.join(process.cwd(), 'tests', '.tmp', `agent-${providerId}-${Date.now()}`),
		providerFactory: () => ({ stream: async function* () {} }) as ProviderAdapter,
		policy: undefined,
		toolsFactory: () => [],
		capabilityService: {
			resolveForPrompt: async (input) => ({
				tools: input.localTools,
				connectorTools: [],
				skills: [],
				promptAdditions: '',
				directAnswer: true,
				decision: { mode: 'direct_answer', reason: '' },
			}),
		},
		executionService: {
			execute,
		},
	});
}

describe('AgentService OpenAI connector plumbing', () => {
	it('passes connector built-ins through the provider adapter', async () => {
		const builtInTools = [
			{
				type: 'mcp' as const,
				server_label: 'acme_mail',
				connector_id: 'connector_acme_mail',
				authorization: 'acme-token',
				require_approval: 'always' as const,
			},
		];
		const connectors = {
			createBuiltInConnectorTools: jest.fn((providerId: string) =>
				providerId === 'openai' ? builtInTools : []
			),
		};
		const execute = jest.fn(async (input: AgentRunInput) => ({
			finalText: 'ok',
			toolCalls: 0,
			usage: { inputTokens: 0, outputTokens: 0 },
			stopReason: 'end_turn' as const,
			session: input.session,
		}));

		await service('openai', connectors, execute).send('hello');

		expect(connectors.createBuiltInConnectorTools).toHaveBeenCalledWith('openai');
		expect(execute.mock.calls[0][0].builtInTools).toEqual(builtInTools);

		execute.mockClear();
		connectors.createBuiltInConnectorTools.mockClear();

		await service('anthropic', connectors, execute).send('hello');

		expect(connectors.createBuiltInConnectorTools).toHaveBeenCalledWith('anthropic');
		expect(execute.mock.calls[0][0].builtInTools).toEqual([]);
	});
});
