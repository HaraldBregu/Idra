import path from 'node:path';
import type { ProviderStreamRequest } from '../../../../src/main/provider/types';
import { AgentService, AgentStartupFilesService } from '../../../../src/main/agent';
import { AgentRunLogger } from '../../../../src/main/agent/run-logger';
import { makeLogger, makeTempDir } from '../test-helpers';

function end() {
	return {
		type: 'message_end' as const,
		stopReason: 'end_turn' as const,
		usage: { inputTokens: 1, outputTokens: 1 },
	};
}

function makeDeps(workspace: string, startupFiles: AgentStartupFilesService) {
	const providerRecord = {
		id: 'openai',
		name: 'OpenAI',
		apiKey: 'sk-test',
		baseUrl: 'https://api.openai.com/v1',
	};
	return {
		store: {
			getAssistantOperator: jest.fn(() => ({
				provider: { id: 'openai', name: 'OpenAI', baseUrl: providerRecord.baseUrl },
				model: { id: 'gpt-test', name: 'GPT Test' },
			})),
			getProviderById: jest.fn(() => providerRecord),
		},
		cron: {} as never,
		logger: makeLogger() as never,
		eventBus: {
			broadcast: jest.fn(),
			emit: jest.fn(),
			on: jest.fn(),
			off: jest.fn(),
			sendTo: jest.fn(),
		} as never,
		workspace: {
			getRootPath: jest.fn(() => workspace),
			readWorkspaceFile: jest.fn(),
		} as never,
		userDataDirectory: {
			getRootPath: jest.fn(() => workspace),
			ensureRoot: jest.fn(async () => workspace),
			resolve: jest.fn((...segments: string[]) => path.join(workspace, ...segments)),
			resolveExisting: jest.fn(async (...segments: string[]) => path.join(workspace, ...segments)),
		} as never,
		startupFiles,
	};
}

describe('AgentService first-run startup bootstrap', () => {
	it('injects BOOTSTRAP.md and exposes startup_files for a fresh primary workspace', async () => {
		const root = await makeTempDir();
		const startupFiles = new AgentStartupFilesService({ rootPath: path.join(root, 'workspaces') });
		const workspace = startupFiles.getRootPath('main');
		const requests: ProviderStreamRequest[] = [];
		const service = new AgentService(makeDeps(workspace, startupFiles), {
			sessionBaseDir: path.join(root, 'sessions'),
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: path.join(root, 'runs') }),
			providerFactory: () => ({
				async *stream(req) {
					requests.push(req);
					yield { type: 'text_delta' as const, text: 'Hi, I am Friday.' };
					yield end();
				},
			}),
		});

		await expect(service.send('hi')).resolves.toBe('Hi, I am Friday.');

		expect(requests[0]!.system).toContain('BOOTSTRAP.md is pending');
		expect(requests[0]!.system).toContain('Start with a brief presentation');
		expect(requests[0]!.tools.map((tool) => tool.name)).toEqual(['startup_files']);
		await expect(startupFiles.isBootstrapPending('main')).resolves.toBe(true);
	});

	it('lets the agent update startup files and complete bootstrap', async () => {
		const root = await makeTempDir();
		const startupFiles = new AgentStartupFilesService({ rootPath: path.join(root, 'workspaces') });
		const workspace = startupFiles.getRootPath('main');
		const turns = [
			[
				{ type: 'tool_call_start' as const, id: 'write-startup', name: 'startup_files' },
				{
					type: 'tool_call_args_delta' as const,
					id: 'write-startup',
					jsonDelta: JSON.stringify({
						operation: 'write',
						files: {
							'IDENTITY.md': '# IDENTITY.md\n\n- **Name:** Friday\n',
							'USER.md': '# USER.md\n\n- **What to call them:** Harald\n',
							'SOUL.md': '# SOUL.md\n\nBe concise and direct.\n',
						},
					}),
				},
				{ type: 'tool_call_end' as const, id: 'write-startup' },
				end(),
			],
			[
				{ type: 'tool_call_start' as const, id: 'complete', name: 'startup_files' },
				{
					type: 'tool_call_args_delta' as const,
					id: 'complete',
					jsonDelta: JSON.stringify({ operation: 'complete_bootstrap' }),
				},
				{ type: 'tool_call_end' as const, id: 'complete' },
				end(),
			],
			[{ type: 'text_delta' as const, text: 'Bootstrap complete.' }, end()],
		];
		let turn = 0;
		const service = new AgentService(makeDeps(workspace, startupFiles), {
			sessionBaseDir: path.join(root, 'sessions'),
			runLoggerFactory: (id) => new AgentRunLogger(id, { baseDir: path.join(root, 'runs') }),
			providerFactory: () => ({
				async *stream() {
					for (const event of turns[turn++] ?? []) yield event;
				},
			}),
		});

		await expect(service.send('Call me Harald. Keep things direct.')).resolves.toBe(
			'Bootstrap complete.'
		);

		await expect(startupFiles.isBootstrapPending('main')).resolves.toBe(false);
		await expect(startupFiles.readFile('main', 'BOOTSTRAP.md')).resolves.toMatchObject({
			missing: true,
		});
		await expect(startupFiles.readFile('main', 'USER.md')).resolves.toMatchObject({
			content: expect.stringContaining('Harald'),
		});
	});
});
