import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../core/services';
import { wrapSimpleHandler } from './ipc-error-handler';
import { CronChannels } from '../../shared/ipc-channels';
import {
	type CronSchedulePermissionLevel,
	type CronScheduleFilter,
} from '../../shared/cron';

function uiActor(userId?: string) {
	return {
		source: 'ui' as const,
		userId,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
		permissions: [
			'deleteSchedule',
			'pauseSchedule',
			'resumeSchedule',
			'listSchedules',
			'runScheduleNow',
			'scheduleReadPrivateData',
		] satisfies CronSchedulePermissionLevel[],
	};
}

export class CronIpc implements IpcModule {
	readonly name = 'cron';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const cron = container.get('cron');

		ipcMain.handle(
			CronChannels.pauseSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.pauseSchedule(scheduleId, uiActor()), CronChannels.pauseSchedule)
		);

		ipcMain.handle(
			CronChannels.resumeSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.resumeSchedule(scheduleId, uiActor()), CronChannels.resumeSchedule)
		);

		ipcMain.handle(
			CronChannels.deleteSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.deleteSchedule(scheduleId, uiActor()), CronChannels.deleteSchedule)
		);

		ipcMain.handle(
			CronChannels.listSchedules,
			wrapSimpleHandler((filter?: CronScheduleFilter) => cron.listSchedules(filter ?? {}, uiActor()), CronChannels.listSchedules)
		);

		ipcMain.handle(
			CronChannels.getSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.getSchedule(scheduleId, uiActor()), CronChannels.getSchedule)
		);

		ipcMain.handle(
			CronChannels.runNow,
			wrapSimpleHandler((scheduleId: string) => cron.runScheduleNow(scheduleId, uiActor()), CronChannels.runNow)
		);

		cron.events.subscribe((event) => {
			_eventBus.broadcast(CronChannels.event, event);
		});

		logger.info('CronIpc', `Registered ${this.name} module`);
	}
}
