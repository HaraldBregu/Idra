import { ipcRenderer } from 'electron';
import { heartbeat } from '../../../../src/preload';
import { HeartbeatChannels } from '../../../../src/shared/ipc-channels';
import type {
	HeartbeatEventPayload,
	HeartbeatSettings,
	HeartbeatStatus,
} from '../../../../src/shared/heartbeat';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

function makeStatus(overrides: Partial<HeartbeatStatus> = {}): HeartbeatStatus {
	return {
		enabled: true,
		runnerActive: true,
		agentCount: 1,
		lastHeartbeat: null,
		...overrides,
	};
}

describe('heartbeat preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('invokes heartbeat commands and queries through typed IPC channels', async () => {
		const settings: HeartbeatSettings = {
			every: '30m',
			providerId: 'openai',
			modelId: 'gpt-5.4',
			reasoningEffort: 'medium',
		};
		const status = makeStatus();
		const event: HeartbeatEventPayload = { timestamp: 1, status: 'ok-token' };

		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: status })
			.mockResolvedValueOnce({ success: true, data: event })
			.mockResolvedValueOnce({ success: true, data: settings })
			.mockResolvedValueOnce({ success: true, data: { ...settings, every: '15m' } })
			.mockResolvedValueOnce({ success: true, data: makeStatus({ enabled: false }) })
			.mockResolvedValueOnce({ success: true, data: { every: '15m' } })
			.mockResolvedValueOnce({ success: true, data: { every: '10m' } })
			.mockResolvedValueOnce({ success: true, data: { ...settings, providerId: 'deepseek' } })
			.mockResolvedValueOnce({ success: true, data: { ...settings, modelId: 'gpt-5.4-mini' } })
			.mockResolvedValueOnce({ success: true, data: { ...settings, reasoningEffort: 'high' } })
			.mockResolvedValueOnce({
				success: true,
				data: { queued: true, sessionKey: 'main', mode: 'now' },
			})
			.mockResolvedValueOnce({ success: true });

		await expect(heartbeat.status()).resolves.toEqual(status);
		await expect(heartbeat.last()).resolves.toEqual(event);
		await expect(heartbeat.settings()).resolves.toEqual(settings);
		await expect(heartbeat.saveSettings({ every: '15m' })).resolves.toEqual({
			...settings,
			every: '15m',
		});
		await expect(heartbeat.setEnabled({ enabled: false })).resolves.toEqual(
			makeStatus({ enabled: false })
		);
		await expect(heartbeat.getTiming()).resolves.toEqual({ every: '15m' });
		await expect(heartbeat.updateTiming({ every: '10m' })).resolves.toEqual({ every: '10m' });
		await expect(heartbeat.setProviderId({ providerId: 'deepseek' })).resolves.toEqual({
			...settings,
			providerId: 'deepseek',
		});
		await expect(heartbeat.setModelId({ modelId: 'gpt-5.4-mini' })).resolves.toEqual({
			...settings,
			modelId: 'gpt-5.4-mini',
		});
		await expect(heartbeat.setReasoningEffort({ reasoningEffort: 'high' })).resolves.toEqual({
			...settings,
			reasoningEffort: 'high',
		});
		await expect(heartbeat.systemEvent({ text: 'Check notifications', mode: 'now' })).resolves.toEqual(
			{ queued: true, sessionKey: 'main', mode: 'now' }
		);
		await expect(heartbeat.request({ source: 'manual', intent: 'manual' })).resolves.toBeUndefined();

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(1, HeartbeatChannels.status);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, HeartbeatChannels.last);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, HeartbeatChannels.settings);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			4,
			HeartbeatChannels.saveSettings,
			{ every: '15m' }
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			8,
			HeartbeatChannels.setProviderId,
			{ providerId: 'deepseek' }
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			9,
			HeartbeatChannels.setModelId,
			{ modelId: 'gpt-5.4-mini' }
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			10,
			HeartbeatChannels.setReasoningEffort,
			{ reasoningEffort: 'high' }
		);
	});

	it('subscribes and unsubscribes from heartbeat events', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);
		const callback = jest.fn();
		const event: HeartbeatEventPayload = { timestamp: 1, status: 'sent' };

		const unsubscribe = heartbeat.onEvent(callback);
		ipcListener?.({} as Electron.IpcRendererEvent, event);
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(HeartbeatChannels.event, expect.any(Function));
		expect(callback).toHaveBeenCalledWith(event);
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			HeartbeatChannels.event,
			ipcListener
		);
	});

	it('rejects malformed heartbeat request objects before IPC invocation', () => {
		expect(() => heartbeat.saveSettings(null as never)).toThrow('Invalid heartbeat request.');
		expect(mockedIpcRenderer.invoke).not.toHaveBeenCalled();
	});
});
