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
	type CronTask,
	type CronTaskData,
	type CronTaskView,
} from '../../shared/cron';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string') throw new Error('Expected a string value.');
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function assertNonEmptyString(value: unknown, label: string): string {
	const text = toOptionalString(value);
	if (!text) throw new Error(`${label} is required.`);
	return text;
}

function assertScheduleId(value: unknown, label: string): string {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} is required.`);
	}
	return value.trim();
}

function parseCronTaskOptions(value: unknown): { id?: string; timezone?: string } | undefined {
	if (value === undefined) return undefined;
	if (!isObject(value)) throw new Error('Invalid cron task options.');
	return {
		id: toOptionalString(value.id),
		timezone: toOptionalString(value.timezone),
	};
}

function parseNextRunCount(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
		throw new Error('count must be an integer.');
	}
	if (value <= 0) throw new Error('count must be greater than 0.');
	return value;
}

function parseCronScheduleFilter(value: unknown): CronScheduleFilter {
	if (!value) return {};
	if (!isObject(value)) throw new Error('Invalid cron schedule filter.');
	const input = value as Record<string, unknown>;
	const filter: CronScheduleFilter = {};

	const includeDeleted = input.includeDeleted;
	if (includeDeleted !== undefined) {
		if (typeof includeDeleted !== 'boolean') throw new Error('includeDeleted must be boolean.');
		filter.includeDeleted = includeDeleted;
	}

	filter.status = parseFilterStringOrArray(input.status, 'status') as CronScheduleFilter['status'];
	filter.source = parseFilterStringOrArray(input.source, 'source') as CronScheduleFilter['source'];
	filter.visibility = parseFilterStringOrArray(input.visibility, 'visibility') as CronScheduleFilter['visibility'];

	filter.sourceId = toOptionalString(input.sourceId);
	filter.ownerUserId = toOptionalString(input.ownerUserId);
	filter.sessionId = toOptionalString(input.sessionId);
	filter.taskType = toOptionalString(input.taskType);
	filter.tag = toOptionalString(input.tag);

	if (input.limit !== undefined) {
		if (typeof input.limit !== 'number' || !Number.isFinite(input.limit) || !Number.isInteger(input.limit)) {
			throw new Error('limit must be an integer.');
		}
		if (input.limit < 1) throw new Error('limit must be greater than 0.');
		filter.limit = input.limit;
	}

	return filter;
}

function parseFilterStringOrArray(
	value: unknown,
	name: string
): string | string[] | undefined {
	if (value === undefined) return undefined;
	if (typeof value === 'string') {
		const text = value.trim();
		if (!text) throw new Error(`${name} must be a non-empty string.`);
		return text;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) throw new Error(`${name} must not be empty.`);
		const list = value.map((entry) => {
			if (typeof entry !== 'string') throw new Error(`${name} entries must be strings.`);
			const text = entry.trim();
			if (!text) throw new Error(`${name} entries must be non-empty.`);
			return text;
		});
		return list;
	}
	throw new Error(`${name} must be a string or string[]`);
}

function assertCreateRequest(value: unknown): asserts value is CronScheduleCreateRequest {
	if (!isObject(value)) throw new Error('Invalid cron schedule request.');
	if (!toOptionalString(value.name)) throw new Error('Cron schedule name is required.');
	if (!toOptionalString(value.type)) throw new Error('Cron schedule type is required.');
	if (!toOptionalString(value.taskType)) throw new Error('Cron schedule taskType is required.');
	if (!toOptionalString(value.timezone)) throw new Error('Cron schedule timezone is required.');
}

function assertPatch(value: unknown): asserts value is CronScheduleUpdateRequest {
	if (!isObject(value)) throw new Error('Invalid cron schedule update.');
}

function uiActor(userId = 'local') {
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
					assertNonEmptyString(expression, 'Cron schedule expression');
					if (!isCronTaskData(data)) {
						throw new Error('Invalid cron task data: missing string "type" discriminator');
					}
					const parsedOptions = parseCronTaskOptions(options);
					const id = parsedOptions?.id ?? randomUUID();
					return cron.schedule(
						id,
						expression.trim(),
						data,
						() => {
							logger.info('CronService', `Tick: ${id} '${expression}' — [${data.type}]`);
						},
						{ timezone: parsedOptions?.timezone }
					);
				},
				CronChannels.add
			)
		);

		ipcMain.handle(
			CronChannels.remove,
			wrapSimpleHandler((id: string): void => {
				cron.unschedule(assertScheduleId(id, 'Cron task id'));
			}, CronChannels.remove)
		);

		ipcMain.handle(
			CronChannels.createSchedule,
			wrapSimpleHandler((request: CronScheduleCreateRequest) => {
				assertCreateRequest(request);
				const ownerUserId = 'local';
				const actor = uiActor(ownerUserId);
				return cron.createSchedule(
					{
						...request,
						source: request.source ?? 'ui',
						createdBy: actor.userId,
						ownerUserId: actor.userId,
					},
					actor
				);
			}, CronChannels.createSchedule)
		);

		ipcMain.handle(
			CronChannels.updateSchedule,
			wrapSimpleHandler((scheduleId: string, patch: CronScheduleUpdateRequest) => {
				scheduleId = assertScheduleId(scheduleId, 'scheduleId');
				assertPatch(patch);
				return cron.updateSchedule(scheduleId, patch, uiActor());
			}, CronChannels.updateSchedule)
		);

		ipcMain.handle(
			CronChannels.pauseSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.pauseSchedule(assertScheduleId(scheduleId, 'scheduleId'), uiActor()), CronChannels.pauseSchedule)
		);

		ipcMain.handle(
			CronChannels.resumeSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.resumeSchedule(assertScheduleId(scheduleId, 'scheduleId'), uiActor()), CronChannels.resumeSchedule)
		);

		ipcMain.handle(
			CronChannels.deleteSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.deleteSchedule(assertScheduleId(scheduleId, 'scheduleId'), uiActor()), CronChannels.deleteSchedule)
		);

		ipcMain.handle(
			CronChannels.listSchedules,
			wrapSimpleHandler((filter?: CronScheduleFilter) => cron.listSchedules(parseCronScheduleFilter(filter), uiActor()), CronChannels.listSchedules)
		);

		ipcMain.handle(
			CronChannels.getSchedule,
			wrapSimpleHandler((scheduleId: string) => cron.getSchedule(assertScheduleId(scheduleId, 'scheduleId'), uiActor()), CronChannels.getSchedule)
		);

		ipcMain.handle(
			CronChannels.getScheduleEvents,
			wrapSimpleHandler((scheduleId: string) => cron.getScheduleEvents(assertScheduleId(scheduleId, 'scheduleId')), CronChannels.getScheduleEvents)
		);

		ipcMain.handle(
			CronChannels.getScheduleExecutions,
			wrapSimpleHandler((scheduleId: string) => cron.getScheduleExecutions(assertScheduleId(scheduleId, 'scheduleId')), CronChannels.getScheduleExecutions)
		);

		ipcMain.handle(
			CronChannels.getNextRuns,
			wrapSimpleHandler((scheduleId: string, count: number) =>
				cron.getNextRuns(
					assertScheduleId(scheduleId, 'scheduleId'),
					parseNextRunCount(count),
					uiActor()
				),
				CronChannels.getNextRuns
			)
		);

		ipcMain.handle(
			CronChannels.runNow,
			wrapSimpleHandler((scheduleId: string) => cron.runScheduleNow(assertScheduleId(scheduleId, 'scheduleId'), uiActor()), CronChannels.runNow)
		);

		cron.events.subscribe((event) => {
			_eventBus.broadcast(CronChannels.event, event);
		});

		logger.info('CronIpc', `Registered ${this.name} module`);
	}
}
