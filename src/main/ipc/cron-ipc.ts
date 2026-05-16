import { randomUUID } from 'node:crypto';
import { ipcMain } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapSimpleHandler } from './ipc-error-handler';
import { CronChannels } from '../../shared/ipc-channels';
import {
	isCronTaskData,
	type CronSchedulePermissionLevel,
	type CronScheduleCreateRequest,
	type CronScheduleFilter,
	type CronScheduleUpdateRequest,
	type OpenClawCronToolRequest,
	type CronTask,
	type CronTaskData,
	type CronTaskView,
} from '../../shared/cron';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertCreateRequest(value: unknown): asserts value is CronScheduleCreateRequest {
	if (!isObject(value)) throw new Error('Invalid cron schedule request.');
	if (typeof value.name !== 'string') throw new Error('Cron schedule name is required.');
	if (typeof value.type !== 'string') throw new Error('Cron schedule type is required.');
	if (typeof value.taskType !== 'string') throw new Error('Cron schedule taskType is required.');
	if (typeof value.timezone !== 'string') throw new Error('Cron schedule timezone is required.');
}

function assertPatch(value: unknown): asserts value is CronScheduleUpdateRequest {
	if (!isObject(value)) throw new Error('Invalid cron schedule update.');
}

function uiActor(userId?: string) {
	return {
		source: 'ui' as const,
		userId,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
		permissions: [
			'createSchedule',
			'updateSchedule',
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
			CronChannels.list,
			wrapSimpleHandler((): CronTaskView[] => {
				return cron.getTasks();
			}, CronChannels.list)
		);

		ipcMain.handle(
			CronChannels.add,
			wrapSimpleHandler(
				(
					expression: string,
					data: CronTaskData,
					options?: { id?: string; timezone?: string }
				): CronTask => {
					if (!isCronTaskData(data)) {
						throw new Error('Invalid cron task data: missing string "type" discriminator');
					}
					const id = options?.id ?? randomUUID();
					return cron.schedule(
						id,
						expression,
						data,
						() => {
							logger.info('CronService', `Tick: ${id} '${expression}' — [${data.type}]`);
						},
						{ timezone: options?.timezone }
					);
				},
				CronChannels.add
			)
		);

		ipcMain.handle(
			CronChannels.remove,
			wrapSimpleHandler((id: string): void => {
				cron.unschedule(id);
			}, CronChannels.remove)
		);

		ipcMain.handle(
			CronChannels.createSchedule,
			wrapSimpleHandler((request: CronScheduleCreateRequest) => {
				assertCreateRequest(request);
				return cron.createSchedule({ ...request, source: request.source ?? 'ui' }, uiActor(request.ownerUserId));
			}, CronChannels.createSchedule)
		);

		ipcMain.handle(
			CronChannels.updateSchedule,
			wrapSimpleHandler((scheduleId: string, patch: CronScheduleUpdateRequest) => {
				if (typeof scheduleId !== 'string' || !scheduleId.trim()) throw new Error('scheduleId is required.');
				assertPatch(patch);
				return cron.updateSchedule(scheduleId, patch, uiActor());
			}, CronChannels.updateSchedule)
		);

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
			CronChannels.getScheduleEvents,
			wrapSimpleHandler((scheduleId: string) => cron.getScheduleEvents(scheduleId), CronChannels.getScheduleEvents)
		);

		ipcMain.handle(
			CronChannels.getScheduleExecutions,
			wrapSimpleHandler((scheduleId: string) => cron.getScheduleExecutions(scheduleId), CronChannels.getScheduleExecutions)
		);

		ipcMain.handle(
			CronChannels.getNextRuns,
			wrapSimpleHandler((scheduleId: string, count: number) => cron.getNextRuns(scheduleId, count, uiActor()), CronChannels.getNextRuns)
		);

		ipcMain.handle(
			CronChannels.runNow,
			wrapSimpleHandler((scheduleId: string) => cron.runScheduleNow(scheduleId, uiActor()), CronChannels.runNow)
		);

		ipcMain.handle(
			CronChannels.action,
			wrapSimpleHandler((request: OpenClawCronToolRequest) => {
				return cron.openClawAction(request, { role: 'owner' });
			}, CronChannels.action)
		);

		cron.events.subscribe((event) => {
			_eventBus.broadcast(CronChannels.event, event);
		});

		logger.info('CronIpc', `Registered ${this.name} module`);
	}
}
