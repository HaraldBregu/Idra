import { ipcRenderer } from 'electron';
import { agent } from '../../../../src/preload';
import { AgentChannels } from '../../../../src/shared/ipc-channels';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentStartupFileContent,
	AgentStartupFileSummary,
	AgentSendRuntimeOptions,
} from '../../../../src/shared/agents/service';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('agent preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('invokes agent invoke-style commands and startup-file queries through typed IPC channels', async () => {
		const sendResult = 'agent acknowledged';
		const history: AgentHistoryMessage[] = [{ role: 'user', content: 'Hello' }];
		const summaries: AgentStartupFileSummary[] = [
			{
				name: 'AGENTS.md',
				path: '/tmp/agents/AGENTS.md',
				missing: false,
				size: 128,
			},
		];
		const startupFile: AgentStartupFileContent = {
			name: 'AGENTS.md',
			path: '/tmp/agents/AGENTS.md',
			missing: false,
			content: '# startup',
		};
		const options: AgentSendRuntimeOptions = { agentRuntime: 'main' };

		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: sendResult })
			.mockResolvedValueOnce({ success: true, data: undefined })
			.mockResolvedValueOnce({ success: true, data: undefined })
			.mockResolvedValueOnce({ success: true, data: history })
			.mockResolvedValueOnce({ success: true, data: undefined })
			.mockResolvedValueOnce({ success: true, data: summaries })
			.mockResolvedValueOnce({ success: true, data: startupFile })
			.mockResolvedValueOnce({ success: true, data: startupFile })
			.mockResolvedValueOnce({ success: true, data: summaries })
			.mockResolvedValueOnce({ success: true, data: startupFile })
			.mockResolvedValueOnce({ success: true, data: startupFile });

		await expect(agent.send('Hello', options)).resolves.toEqual(sendResult);
		await expect(agent.reset()).resolves.toBeUndefined();
		await expect(agent.cancel()).resolves.toBeUndefined();
		await expect(agent.getHistory()).resolves.toEqual(history);
		await expect(agent.openHistoryFolder()).resolves.toBeUndefined();
		await expect(agent.listStartupFiles()).resolves.toEqual(summaries);
		await expect(agent.readStartupFile('AGENTS.md')).resolves.toEqual(startupFile);
		await expect(agent.writeStartupFile('AGENTS.md', '# updated')).resolves.toEqual(startupFile);
		await expect(agent.listWorkspaceFiles()).resolves.toEqual(summaries);
		await expect(agent.readWorkspaceFile('AGENTS.md')).resolves.toEqual(startupFile);
		await expect(agent.writeWorkspaceFile('AGENTS.md', '# legacy')).resolves.toEqual(startupFile);

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(1, AgentChannels.send, 'Hello', options);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, AgentChannels.reset);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, AgentChannels.cancel);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(4, AgentChannels.getHistory);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(5, AgentChannels.openHistoryFolder);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(6, AgentChannels.listStartupFiles);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(7, AgentChannels.readStartupFile, 'AGENTS.md');
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			8,
			AgentChannels.writeStartupFile,
			'AGENTS.md',
			'# updated'
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(9, AgentChannels.listWorkspaceFiles);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(10, AgentChannels.readWorkspaceFile, 'AGENTS.md');
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			11,
			AgentChannels.writeWorkspaceFile,
			'AGENTS.md',
			'# legacy'
		);
	});

	it('subscribes and unsubscribes from streamed agent response events', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);

		const callback = jest.fn();
		const responseEvent: AgentResponseEvent = {
			type: 'run_state',
			agentId: 'main',
			runId: 'run-1',
			state: 'completed',
		};

		const unsubscribe = agent.onResponse(callback);
		ipcListener?.({} as Electron.IpcRendererEvent, responseEvent);
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(AgentChannels.response, expect.any(Function));
		expect(callback).toHaveBeenCalledWith(responseEvent);
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			AgentChannels.response,
			ipcListener
		);
	});
});
