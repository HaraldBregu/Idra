import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../app/service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { HeartbeatChannels } from '../../shared/ipc-channels';
import type {
	HeartbeatSetEnabledRequest,
	HeartbeatSetModelRequest,
	HeartbeatSetProviderRequest,
	HeartbeatSetReasoningEffortRequest,
	HeartbeatSettingsUpdate,
	HeartbeatSystemEventRequest,
	HeartbeatTimingSettings,
	HeartbeatWakeRequest,
} from '../../shared/heartbeat';

function assertObject(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Invalid heartbeat request.');
	}
}

export class HeartbeatIpc implements IpcModule {
	readonly name = 'heartbeat';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const heartbeat = container.get('heartbeat');

		ipcMain.handle(
			HeartbeatChannels.status,
			wrapSimpleHandler(() => heartbeat.getStatus(), HeartbeatChannels.status)
		);

		ipcMain.handle(
			HeartbeatChannels.last,
			wrapSimpleHandler(() => heartbeat.getLastHeartbeat(), HeartbeatChannels.last)
		);

		ipcMain.handle(
			HeartbeatChannels.settings,
			wrapSimpleHandler(() => heartbeat.getSettings(), HeartbeatChannels.settings)
		);

		ipcMain.handle(
			HeartbeatChannels.saveSettings,
			wrapSimpleHandler((request: HeartbeatSettingsUpdate) => {
				assertObject(request);
				return heartbeat.saveSettings(request);
			}, HeartbeatChannels.saveSettings)
		);

		ipcMain.handle(
			HeartbeatChannels.setEnabled,
			wrapSimpleHandler((request: HeartbeatSetEnabledRequest) => {
				assertObject(request);
				if (typeof request.enabled !== 'boolean') throw new Error('enabled must be boolean.');
				return heartbeat.setEnabled(request.enabled);
			}, HeartbeatChannels.setEnabled)
		);

		ipcMain.handle(
			HeartbeatChannels.getTiming,
			wrapSimpleHandler(() => heartbeat.getTiming(), HeartbeatChannels.getTiming)
		);

		ipcMain.handle(
			HeartbeatChannels.updateTiming,
			wrapSimpleHandler((request: HeartbeatTimingSettings) => {
				assertObject(request);
				return heartbeat.updateTiming(request);
			}, HeartbeatChannels.updateTiming)
		);

		ipcMain.handle(
			HeartbeatChannels.setProviderId,
			wrapSimpleHandler((request: HeartbeatSetProviderRequest) => {
				assertObject(request);
				return heartbeat.setProviderId(request.providerId);
			}, HeartbeatChannels.setProviderId)
		);

		ipcMain.handle(
			HeartbeatChannels.setModelId,
			wrapSimpleHandler((request: HeartbeatSetModelRequest) => {
				assertObject(request);
				return heartbeat.setModelId(request.modelId);
			}, HeartbeatChannels.setModelId)
		);

		ipcMain.handle(
			HeartbeatChannels.setReasoningEffort,
			wrapSimpleHandler((request: HeartbeatSetReasoningEffortRequest) => {
				assertObject(request);
				return heartbeat.setReasoningEffort(request.reasoningEffort);
			}, HeartbeatChannels.setReasoningEffort)
		);

		ipcMain.handle(
			HeartbeatChannels.systemEvent,
			wrapSimpleHandler((request: HeartbeatSystemEventRequest) => {
				assertObject(request);
				return heartbeat.systemEvent(request);
			}, HeartbeatChannels.systemEvent)
		);

		ipcMain.handle(
			HeartbeatChannels.request,
			wrapSimpleHandler((request: HeartbeatWakeRequest) => {
				assertObject(request);
				heartbeat.request(request);
			}, HeartbeatChannels.request)
		);

		eventBus.on('heartbeat:event', (event) => {
			eventBus.broadcast(HeartbeatChannels.event, event.payload);
		});
	}
}
