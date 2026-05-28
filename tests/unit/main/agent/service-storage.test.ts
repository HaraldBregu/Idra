import path from 'node:path';
import { promises as fs } from 'node:fs';
import { AgentService } from '../../../../src/main/agent';
import { makeLogger, makeTempDir } from '../test-helpers';

describe('AgentService agent storage wiring', () => {
	it('uses app-data agent storage for runtime workspace and agent config', async () => {
		const root = await makeTempDir();
		const agentRoot = path.join(root, 'agent');
		const sessionBaseDir = await makeTempDir();
		const providerFactory = jest.fn(() => ({
			async *stream() {
				yield { type: 'text_delta' as const, text: 'done' };
				yield {
					type: 'message_end' as const,
					stopReason: 'end_turn',
					usage: { inputTokens: 1, outputTokens: 1 },
				};
			},
		}));
		const agentDataDirectory = {
			getRootPath: jest.fn(() => agentRoot),
			ensureRoot: jest.fn(async () => agentRoot),
			resolve: jest.fn((...segments: string[]) => path.join(agentRoot, ...segments)),
			resolveExisting: jest.fn(async (...segments: string[]) => path.join(agentRoot, ...segments)),
		};
		const agentSettings = {
			getAgentConfig: jest.fn(() => ({
				id: 'main',
				model: { providerId: 'anthropic', modelId: 'claude-test' },
			})),
		};
		const service = new AgentService(
			{
				store: {
					getAssistantOperator: jest.fn(() => ({
						provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
						model: { id: 'gpt-test', name: 'GPT Test' },
					})),
					getProviderById: jest.fn((id: string) => ({
						id,
						name: id,
						apiKey: 'sk-test',
						baseUrl: `https://${id}.example.test`,
					})),
				} as never,
				cron: {} as never,
				logger: makeLogger() as never,
				eventBus: { broadcast: jest.fn(), emit: jest.fn(), on: jest.fn() } as never,
				workspace: { getRootPath: jest.fn(() => { throw new Error('workspace unavailable'); }) } as never,
				agentDataDirectory,
				agentSettings: agentSettings as never,
				policy: {
					evaluateToolRequest: jest.fn(() => ({ shouldUseTools: false, reason: 'direct' })),
				} as never,
			},
			{
				sessionBaseDir,
				providerFactory,
				toolsFactory: () => [],
			}
		);

		await expect(service.send('hello')).resolves.toBe('done');

		expect(agentSettings.getAgentConfig).toHaveBeenCalledWith('main');
		expect(agentDataDirectory.ensureRoot).toHaveBeenCalled();
		expect(providerFactory).toHaveBeenCalledWith({
			id: 'anthropic',
			apiKey: 'sk-test',
			baseURL: 'https://anthropic.example.test',
		});
		await fs.rm(root, { recursive: true, force: true });
		await fs.rm(sessionBaseDir, { recursive: true, force: true });
	});
});
