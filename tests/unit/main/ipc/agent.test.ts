import { BrowserWindow, ipcMain } from 'electron';
import { AgentIpc } from '../../../../src/main/ipc/agent';
import { AgentChannels } from '../../../../src/shared/ipc_channels_definitions';
import type { Agent } from '../../../../src/main/agent/agent';
import type { EventBus } from '../../../../src/main/event_bus';
import type { LoggerService } from '../../../../src/main/shared';

describe('AgentIpc run ownership', () => {
	beforeEach(() => {
		(ipcMain.handle as jest.Mock).mockReset();
		(BrowserWindow.fromWebContents as jest.Mock).mockReset();
	});

	it('binds sends and scoped cancellation to the originating window', async () => {
		const send = jest.fn().mockResolvedValue('reply');
		const cancel = jest.fn().mockReturnValue(true);
		const agent = {
			send,
			cancel,
			config: { location: '/agent' },
		} as unknown as Agent;
		const eventBus = { sendTo: jest.fn() } as unknown as EventBus;
		const logger = { info: jest.fn() } as unknown as LoggerService;
		const sender = {};
		(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue({ id: 7 });
		new AgentIpc().register({ logger, agent }, eventBus);
		const handler = (channel: string) =>
			(ipcMain.handle as jest.Mock).mock.calls.find(([registered]) => registered === channel)?.[1];

		await expect(
			handler(AgentChannels.send)({ sender }, 'hello', { runId: 'run-1' })
		).resolves.toEqual({ success: true, data: 'reply' });
		expect(send).toHaveBeenCalledWith(
			'hello',
			'main',
				expect.objectContaining({
					runId: 'run-1',
					type: 'default',
				windowId: 7,
				streamEvent: expect.any(Function),
			})
		);
		const streamEvent = send.mock.calls[0][2].streamEvent;
		streamEvent({ type: 'text_delta', delta: 'x', agentId: 'main', runId: 'run-1' });
		expect(eventBus.sendTo).toHaveBeenCalledWith(
			7,
			AgentChannels.response,
			expect.objectContaining({ runId: 'run-1' })
		);

		await expect(handler(AgentChannels.cancel)({ sender }, 'run-1')).resolves.toEqual({
			success: true,
			data: true,
		});
		expect(cancel).toHaveBeenCalledWith('run-1', 7);
	});

	it('rejects cancellation without an originating window', async () => {
		const cancel = jest.fn();
		const agent = { cancel, config: { location: '/agent' } } as unknown as Agent;
		(BrowserWindow.fromWebContents as jest.Mock).mockReturnValue(null);
		new AgentIpc().register({ logger: { info: jest.fn() } as unknown as LoggerService, agent }, {
			sendTo: jest.fn(),
		} as unknown as EventBus);
		const cancelHandler = (ipcMain.handle as jest.Mock).mock.calls.find(
			([channel]) => channel === AgentChannels.cancel
		)?.[1];

		await expect(cancelHandler({ sender: {} }, 'run-1')).resolves.toEqual({
			success: true,
			data: false,
		});
		expect(cancel).not.toHaveBeenCalled();
	});
});
