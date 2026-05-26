import { transcriptToHistory } from '../../../../src/main/ipc/agent-ipc';
import type { TranscriptEntry } from '../../../../src/main/provider/types';
import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { AgentIpc } from '../../../../src/main/ipc/agent-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { AgentChannels } from '../../../../src/shared/ipc-channels';
import { DEFAULT_AGENT_ID } from '../../../../src/main/constants';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

function createContainer(overrides: {
	agentService?: Partial<{
		send: jest.Mock;
		reset: jest.Mock;
		cancel: jest.Mock;
		getHistory: jest.Mock;
	}>;
	startupFiles?: Partial<{
		listFiles: jest.Mock;
		readFile: jest.Mock;
		writeFile: jest.Mock;
	}>;
	userDataDirectory?: Partial<{ resolve: jest.Mock }>;
}): MainServiceContainer {
	const services = {
		logger: {
			info: jest.fn(),
		},
		agentService: {
			send: jest.fn(),
			reset: jest.fn(),
			cancel: jest.fn(),
			getHistory: jest.fn(),
			...overrides.agentService,
		},
		startupFiles: {
			listFiles: jest.fn(),
			readFile: jest.fn(),
			writeFile: jest.fn(),
			...overrides.startupFiles,
		},
		userDataDirectory: {
			resolve: jest.fn(() => '/tmp/agent/sessions'),
			...overrides.userDataDirectory,
		},
	};

	return {
		get: jest.fn((key: string) =>
			// @ts-expect-error index signature for dynamic lookups
			(services as Record<string, unknown>)[key]
		),
	} as unknown as MainServiceContainer;
}

describe('agent/ipc history conversion', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('preserves agent content blocks and tool result metadata for renderer history', () => {
		const transcript: TranscriptEntry[] = [
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Reading.' },
					{
						type: 'tool_use',
						toolUseId: 'tool-1',
						toolName: 'read_file',
						toolArgs: { path: 'README.md' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-1',
				isError: true,
				content: [
					{ type: 'text', text: 'failed' },
					{ type: 'image', mimeType: 'image/png', base64: 'abc' },
				],
			},
		];

		expect(transcriptToHistory(transcript)).toEqual([
			{ role: 'user', content: 'read it' },
			{
				role: 'assistant',
				content: 'Reading.',
				contentBlocks: [
					{ type: 'text', text: 'Reading.' },
					{
						type: 'tool_use',
						toolUseId: 'tool-1',
						toolName: 'read_file',
						toolArgs: { path: 'README.md' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-1',
				isError: true,
				status: 'error',
				output: [
					{ type: 'text', text: 'failed' },
					{ type: 'image', mimeType: 'image/png', base64: '[base64 image]' },
				],
				content: 'failed\n[binary]',
			},
		]);
	});

	it('preserves rejected tool result status for restored renderer state', () => {
		const transcript: TranscriptEntry[] = [
			{
				role: 'assistant',
				content: [
					{
						type: 'tool_use',
						toolUseId: 'tool-denied',
						toolName: 'exec',
						toolArgs: { command: 'rm -rf /tmp/example' },
					},
				],
			},
			{
				role: 'tool',
				toolUseId: 'tool-denied',
				isError: true,
				status: 'rejected',
				content: [{ type: 'text', text: 'Tool execution failed for exec.' }],
			},
		];

		expect(transcriptToHistory(transcript)[1]).toEqual({
			role: 'tool',
			toolUseId: 'tool-denied',
			isError: true,
			status: 'rejected',
			output: 'Tool execution failed for exec.',
			content: 'Tool execution failed for exec.',
		});
	});

	it('registers invoke handlers for startup file and agent lifecycle operations', async () => {
		const agentService = {
			send: jest.fn().mockResolvedValue('response'),
			reset: jest.fn(),
			cancel: jest.fn(),
			getHistory: jest.fn().mockResolvedValue([]),
		};
		const startupFiles = {
			listFiles: jest.fn().mockResolvedValue([{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }]),
			readFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
			writeFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
		};

		new AgentIpc().register(createContainer({ agentService, startupFiles }), new EventBus());

		await expect(registeredHandler(AgentChannels.send)({}, 'hello')).resolves.toEqual({
			success: true,
			data: 'response',
		});
		await expect(registeredHandler(AgentChannels.getHistory)({})).resolves.toEqual({
			success: true,
			data: [],
		});
		await expect(registeredHandler(AgentChannels.listStartupFiles)({})).resolves.toEqual({
			success: true,
			data: [{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }],
		});
		await expect(registeredHandler(AgentChannels.readStartupFile)({}, 'AGENTS.md')).resolves.toEqual({
			success: true,
			data: { name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false },
		});
		await expect(
			registeredHandler(AgentChannels.writeStartupFile)({}, 'AGENTS.md', 'updated content')
		).resolves.toEqual({ success: true, data: { name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false } });

		expect(startupFiles.listFiles).toHaveBeenCalledWith(DEFAULT_AGENT_ID);
		expect(startupFiles.readFile).toHaveBeenCalledWith(DEFAULT_AGENT_ID, 'AGENTS.md');
		expect(startupFiles.writeFile).toHaveBeenCalledWith(
			DEFAULT_AGENT_ID,
			'AGENTS.md',
			'updated content'
		);
	});

	it('registers legacy workspace file handlers that proxy to startup files', async () => {
		const startupFiles = {
			listFiles: jest.fn().mockResolvedValue([{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }]),
			readFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
			writeFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
		};

		new AgentIpc().register(
			createContainer({
				agentService: {
					send: jest.fn().mockResolvedValue('response'),
					reset: jest.fn(),
					cancel: jest.fn(),
					getHistory: jest.fn().mockResolvedValue([]),
				},
				startupFiles,
			}),
			new EventBus()
		);

		await expect(registeredHandler(AgentChannels.listWorkspaceFiles)({})).resolves.toEqual({
			success: true,
			data: [{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }],
		});
		await expect(registeredHandler(AgentChannels.readWorkspaceFile)({}, 'AGENTS.md')).resolves.toEqual({
			success: true,
			data: { name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false },
		});
		await expect(registeredHandler(AgentChannels.writeWorkspaceFile)({}, 'AGENTS.md', 'legacy content')).resolves.toEqual(
			{
				success: true,
				data: { name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false },
			}
		);

		expect(startupFiles.listFiles).toHaveBeenCalledWith(DEFAULT_AGENT_ID);
		expect(startupFiles.readFile).toHaveBeenCalledWith(DEFAULT_AGENT_ID, 'AGENTS.md');
		expect(startupFiles.writeFile).toHaveBeenCalledWith(DEFAULT_AGENT_ID, 'AGENTS.md', 'legacy content');
	});
});
