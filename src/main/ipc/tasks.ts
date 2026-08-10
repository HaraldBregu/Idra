import type { EventBus } from '../event_bus';
import { TaskChannels } from '../../shared/ipc_channels_definitions';
import {
	configureScheduleCapabilities,
	getRuntime,
	getTaskPermissions,
	listSchedules,
	resetTaskPermissions,
	saveTaskPermissions,
	setRuntime,
} from '../tasks';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class TaskIpc implements IpcModule {
	readonly name = 'tasks';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(TaskChannels.list, () => listSchedules());
		registerQuery(TaskChannels.getRuntime, () => getRuntime());
		registerCommand(TaskChannels.setRuntime, (providerId: string, modelId: string) => {
			return setRuntime(providerId, modelId);
		});
		registerQuery(TaskChannels.permissionsGet, () => getTaskPermissions());
		registerCommand(TaskChannels.permissionsSave, (value: unknown) => {
			if (!value || typeof value !== 'object' || Array.isArray(value)) {
				throw new Error('Invalid task permissions.');
			}
			return saveTaskPermissions(value);
		});
		registerCommand(TaskChannels.permissionsReset, () => resetTaskPermissions());
		registerCommand(
			TaskChannels.configureCapabilities,
			(scheduleId: string, enabled: boolean, toolsAllow: string[]) => {
				if (typeof scheduleId !== 'string' || typeof enabled !== 'boolean' || !Array.isArray(toolsAllow))
					throw new Error('Invalid schedule capability configuration.');
				return configureScheduleCapabilities(scheduleId, enabled, toolsAllow);
			}
		);
	}
}
