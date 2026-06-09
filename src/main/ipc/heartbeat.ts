import { ipcMain } from 'electron';
import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { wrapSimpleHandler } from './core/error-handler';
import { HeartbeatChannels } from '../../shared/ipc/ipc-channels';
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

export class HeartbeatIpc implements IpcModule {
	readonly name = 'heartbeat';

	register(container: MainServiceContainer, eventBus: EventBus): void {
		const logger = container.get('logger');
		const heartbeat = container.get('heartbeat');

		ipcMain.handle(
			HeartbeatChannels.status,
			wrapSimpleHandler(() => heartbeat.getStatus(), HeartbeatChannels.status)
		);

		ipcMain.handle(
			HeartbeatChannels.last,
			wrapSimpleHandler(() => heartbeat.getLast(), HeartbeatChannels.last)
		);

		ipcMain.handle(
			HeartbeatChannels.settings,
			wrapSimpleHandler(() => heartbeat.getSettings(), HeartbeatChannels.settings)
		);

		ipcMain.handle(
			HeartbeatChannels.saveSettings,
			wrapSimpleHandler(
				(update: HeartbeatSettingsUpdate) => heartbeat.saveSettings(update),
				HeartbeatChannels.saveSettings
			)
		);

		ipcMain.handle(
			HeartbeatChannels.setEnabled,
			wrapSimpleHandler(
				(request: HeartbeatSetEnabledRequest) => heartbeat.setEnabled(request),
				HeartbeatChannels.setEnabled
			)
		);

		ipcMain.handle(
			HeartbeatChannels.getTiming,
			wrapSimpleHandler(() => heartbeat.getTiming(), HeartbeatChannels.getTiming)
		);

		ipcMain.handle(
			HeartbeatChannels.updateTiming,
			wrapSimpleHandler(
				(timing: HeartbeatTimingSettings) => heartbeat.updateTiming(timing),
				HeartbeatChannels.updateTiming
			)
		);

		ipcMain.handle(
			HeartbeatChannels.setProviderId,
			wrapSimpleHandler(
				(request: HeartbeatSetProviderRequest) => heartbeat.setProviderId(request),
				HeartbeatChannels.setProviderId
			)
		);

		ipcMain.handle(
			HeartbeatChannels.setModelId,
			wrapSimpleHandler(
				(request: HeartbeatSetModelRequest) => heartbeat.setModelId(request),
				HeartbeatChannels.setModelId
			)
		);

		ipcMain.handle(
			HeartbeatChannels.setReasoningEffort,
			wrapSimpleHandler(
				(request: HeartbeatSetReasoningEffortRequest) => heartbeat.setReasoningEffort(request),
				HeartbeatChannels.setReasoningEffort
			)
		);

		ipcMain.handle(
			HeartbeatChannels.systemEvent,
			wrapSimpleHandler(
				(request: HeartbeatSystemEventRequest) => heartbeat.systemEvent(request),
				HeartbeatChannels.systemEvent
			)
		);

		ipcMain.handle(
			HeartbeatChannels.request,
			wrapSimpleHandler(
				(request: HeartbeatWakeRequest) => heartbeat.request(request),
				HeartbeatChannels.request
			)
		);

		heartbeat.events.subscribe((event) => {
			eventBus.broadcast(HeartbeatChannels.event, event);
		});

		logger.info('HeartbeatIpc', `Registered ${this.name} module`);
	}
}
