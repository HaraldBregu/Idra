import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { HeartbeatIpc } from '../../../../src/main/ipc/heartbeat-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { HeartbeatChannels } from '../../../../src/shared/ipc-channels';
import type { HeartbeatEventPayload, HeartbeatStatus } from '../../../../src/shared/heartbeat';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

function makeStatus(overrides: Partial<HeartbeatStatus> = {}): HeartbeatStatus {
	return {
		enabled: true,
		runnerActive: true,
		agentCount: 1,
		lastHeartbeat: null,
		...overrides,
	};
}

describe('HeartbeatIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('delegates heartbeat settings and model selection handlers to HeartbeatService', async () => {
		const settings = {
			every: '30m',
			providerId: 'openai',
			modelId: 'gpt-5.4',
			reasoningEffort: 'medium',
		} as const;
		const heartbeat = {
			getStatus: jest.fn(() => makeStatus()),
			getLastHeartbeat: jest.fn(() => null),
			getSettings: jest.fn(() => settings),
			saveSettings: jest.fn(() => ({ ...settings, every: '15m' })),
			setEnabled: jest.fn((enabled: boolean) => makeStatus({ enabled })),
			getTiming: jest.fn(() => ({ every: '30m' })),
			updateTiming: jest.fn(() => ({ every: '10m' })),
			setProviderId: jest.fn(() => ({ ...settings, providerId: 'deepseek' })),
			setModelId: jest.fn(() => ({ ...settings, modelId: 'gpt-5.4-mini' })),
			setReasoningEffort: jest.fn(() => ({ ...settings, reasoningEffort: 'high' })),
			systemEvent: jest.fn(),
			request: jest.fn(),
		};
		const container = {
			get: jest.fn(() => heartbeat),
		} as unknown as MainServiceContainer;

		new HeartbeatIpc().register(container, new EventBus());

		await expect(registeredHandler(HeartbeatChannels.settings)({})).resolves.toEqual({
			success: true,
			data: settings,
		});
		await expect(
			registeredHandler(HeartbeatChannels.saveSettings)({}, { every: '15m' })
		).resolves.toEqual({
			success: true,
			data: { ...settings, every: '15m' },
		});
		await expect(
			registeredHandler(HeartbeatChannels.setProviderId)({}, { providerId: 'deepseek' })
		).resolves.toEqual({
			success: true,
			data: { ...settings, providerId: 'deepseek' },
		});
		await expect(
			registeredHandler(HeartbeatChannels.setModelId)({}, { modelId: 'gpt-5.4-mini' })
		).resolves.toEqual({
			success: true,
			data: { ...settings, modelId: 'gpt-5.4-mini' },
		});
		await expect(
			registeredHandler(HeartbeatChannels.setReasoningEffort)({}, { reasoningEffort: 'high' })
		).resolves.toEqual({
			success: true,
			data: { ...settings, reasoningEffort: 'high' },
		});

		expect(heartbeat.saveSettings).toHaveBeenCalledWith({ every: '15m' });
		expect(heartbeat.setProviderId).toHaveBeenCalledWith('deepseek');
		expect(heartbeat.setModelId).toHaveBeenCalledWith('gpt-5.4-mini');
		expect(heartbeat.setReasoningEffort).toHaveBeenCalledWith('high');
	});

	it('rejects malformed heartbeat settings requests before calling the service', async () => {
		const heartbeat = {
			getStatus: jest.fn(),
			getLastHeartbeat: jest.fn(),
			getSettings: jest.fn(),
			saveSettings: jest.fn(),
			setEnabled: jest.fn(),
			getTiming: jest.fn(),
			updateTiming: jest.fn(),
			setProviderId: jest.fn(),
			setModelId: jest.fn(),
			setReasoningEffort: jest.fn(),
			systemEvent: jest.fn(),
			request: jest.fn(),
		};
		const container = {
			get: jest.fn(() => heartbeat),
		} as unknown as MainServiceContainer;

		new HeartbeatIpc().register(container, new EventBus());

		await expect(registeredHandler(HeartbeatChannels.saveSettings)({}, null)).resolves.toMatchObject({
			success: false,
			error: { message: 'Invalid heartbeat request.' },
		});
		expect(heartbeat.saveSettings).not.toHaveBeenCalled();
	});

	it('forwards heartbeat service events to the renderer event channel', () => {
		const heartbeat = {
			getStatus: jest.fn(),
			getLastHeartbeat: jest.fn(),
			getSettings: jest.fn(),
			saveSettings: jest.fn(),
			setEnabled: jest.fn(),
			getTiming: jest.fn(),
			updateTiming: jest.fn(),
			setProviderId: jest.fn(),
			setModelId: jest.fn(),
			setReasoningEffort: jest.fn(),
			systemEvent: jest.fn(),
			request: jest.fn(),
		};
		const container = {
			get: jest.fn(() => heartbeat),
		} as unknown as MainServiceContainer;
		const eventBus = new EventBus();
		const broadcast = jest.spyOn(eventBus, 'broadcast');
		const event: HeartbeatEventPayload = {
			timestamp: 1,
			status: 'ok-token',
			silent: true,
		};

		new HeartbeatIpc().register(container, eventBus);
		eventBus.emit('heartbeat:event', event);

		expect(broadcast).toHaveBeenCalledWith(HeartbeatChannels.event, event);
	});
});
