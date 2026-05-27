import { transcriptToHistory } from '../../../../src/main/ipc/agent-ipc';
import type { TranscriptEntry } from '../../../../src/main/provider/types';
import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { AgentIpc } from '../../../../src/main/ipc/agent-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { AgentChannels } from '../../../../src/shared/ipc-channels';

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
	workspace?: Partial<{
		listWorkspaceFiles: jest.Mock;
		readWorkspaceFile: jest.Mock;
		writeWorkspaceFile: jest.Mock;
	}>;
	agentDataDirectory?: Partial<{ resolve: jest.Mock }>;
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
		workspace: {
			listWorkspaceFiles: jest.fn(),
			readWorkspaceFile: jest.fn(),
			writeWorkspaceFile: jest.fn(),
			...overrides.workspace,
		},
		agentDataDirectory: {
			resolve: jest.fn(() => '/tmp/agent/sessions'),
			...overrides.agentDataDirectory,
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
		const workspace = {
			listWorkspaceFiles: jest.fn().mockResolvedValue([{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }]),
			readWorkspaceFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
			writeWorkspaceFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
		};

		new AgentIpc().register(createContainer({ agentService, workspace }), new EventBus());

		await expect(
			registeredHandler(AgentChannels.send)({}, 'hello', {
				agentRuntime: 'main',
				effort: 'high',
				lightContext: false,
				toolsAllow: [' read_file ', ''],
			})
		).resolves.toEqual({
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

		expect(agentService.send).toHaveBeenCalledWith(
			'hello',
			undefined,
			expect.objectContaining({
				sessionId: 'main',
				effort: 'high',
				lightContext: false,
				toolsAllow: ['read_file'],
				streamEvent: expect.any(Function),
			})
		);
		expect(workspace.listWorkspaceFiles).toHaveBeenCalledWith();
		expect(workspace.readWorkspaceFile).toHaveBeenCalledWith('AGENTS.md');
		expect(workspace.writeWorkspaceFile).toHaveBeenCalledWith(
			'AGENTS.md',
			'updated content'
		);
	});

	it('registers legacy workspace file handlers that proxy to startup files', async () => {
		const workspace = {
			listWorkspaceFiles: jest.fn().mockResolvedValue([{ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }]),
			readWorkspaceFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
			writeWorkspaceFile: jest.fn().mockResolvedValue({ name: 'AGENTS.md', path: '/tmp/AGENTS.md', missing: false }),
		};

		new AgentIpc().register(
			createContainer({
				agentService: {
					send: jest.fn().mockResolvedValue('response'),
					reset: jest.fn(),
					cancel: jest.fn(),
					getHistory: jest.fn().mockResolvedValue([]),
				},
				workspace,
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

		expect(workspace.listWorkspaceFiles).toHaveBeenCalledWith();
		expect(workspace.readWorkspaceFile).toHaveBeenCalledWith('AGENTS.md');
		expect(workspace.writeWorkspaceFile).toHaveBeenCalledWith('AGENTS.md', 'legacy content');
	});
});
