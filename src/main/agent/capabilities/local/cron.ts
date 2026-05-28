import type {
	CronJsonValue,
	CronJsonObject,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronSchedulePermissionLevel,
	CronScheduleUpdateRequest,
	CronScheduledTask,
} from '../../../../shared/cron';
import type { CronActorContext } from '../../../cron/core/cron.types';
import type { JSONSchema } from '../../../provider/types';
import type { AgentTool, ToolContext } from './types';
import { jsonResult } from './types';

type CronServiceLike = {
	createSchedule(request: CronScheduleCreateRequest, actor?: CronActorContext): Promise<CronSchedule>;
	updateSchedule(scheduleId: string, patch: CronScheduleUpdateRequest, actor?: CronActorContext): Promise<CronSchedule>;
	deleteSchedule(scheduleId: string, actor?: CronActorContext): Promise<void>;
	getSchedule(scheduleId: string, actor?: CronActorContext): Promise<CronSchedule>;
	listSchedules(filter?: CronScheduleFilter, actor?: CronActorContext): Promise<CronSchedule[]>;
	pauseSchedule(scheduleId: string, actor?: CronActorContext): Promise<void>;
	resumeSchedule(scheduleId: string, actor?: CronActorContext): Promise<void>;
	runScheduleNow(scheduleId: string, actor?: CronActorContext): Promise<CronScheduledTask>;
};

const CRON_PERMISSIONS: CronSchedulePermissionLevel[] = ['adminScheduleManagement'];

function cronService(ctx: ToolContext): CronServiceLike {
	const service = ctx.services.cron;
	if (!service || typeof service !== 'object') throw new Error('Cron service is unavailable.');
	return service as CronServiceLike;
}

function actor(ctx: ToolContext): CronActorContext {
	const userId = ctx.agentId ?? 'assistant';
	return {
		userId,
		sessionId: ctx.sessionId,
		source: 'agent',
		sourceId: ctx.agentId,
		permissions: CRON_PERMISSIONS,
		timezone: 'UTC',
		confirmed: true,
	};
}

function stringArg(value: unknown, name: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required.`);
	return value.trim();
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function jsonValue(value: unknown, fallback: CronJsonValue): CronJsonValue {
	if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
	if (Array.isArray(value)) return value.map((entry) => jsonValue(entry, null));
	if (value && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, jsonValue(entry, null)]));
	}
	return fallback;
}

function boolValue(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function numberValue(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function scheduleId(args: Record<string, unknown>): string {
	return stringArg(args.scheduleId ?? args.id, 'scheduleId');
}

function createRequest(args: Record<string, unknown>, ctx: ToolContext): CronScheduleCreateRequest {
	const timezone = optionalString(args.timezone) ?? 'UTC';
	const type = optionalString(args.type) ?? 'cron';
	return {
		name: stringArg(args.name, 'name'),
		description: optionalString(args.description),
		type: type as CronScheduleCreateRequest['type'],
		source: 'agent',
		sourceId: ctx.agentId,
		ownerUserId: ctx.agentId ?? 'assistant',
		sessionId: ctx.sessionId,
		createdBy: ctx.agentId ?? 'assistant',
		visibility: 'private',
		timezone,
		cronExpression: optionalString(args.cronExpression),
		intervalMs: numberValue(args.intervalMs),
		runAt: optionalString(args.runAt),
		startAt: optionalString(args.startAt),
		endAt: optionalString(args.endAt),
		target: optionalString(args.target) ?? 'task',
		payload: jsonValue(args.payload, {}),
		taskType: optionalString(args.taskType) ?? 'agent.run',
		taskInput: jsonValue(args.taskInput, {}),
		taskPriority: 'normal',
		taskTags: Array.isArray(args.taskTags) ? args.taskTags.filter((tag): tag is string => typeof tag === 'string') : [],
		taskMetadata: jsonValue(args.taskMetadata, {}) as CronJsonObject,
		requiredPermissions: [],
		requiresConfirmation: false,
		enabled: boolValue(args.enabled, true),
		metadata: jsonValue(args.metadata, {}) as CronJsonObject,
		confirmed: true,
	};
}

function updateRequest(args: Record<string, unknown>): CronScheduleUpdateRequest {
	return {
		name: optionalString(args.name),
		description: optionalString(args.description),
		status: optionalString(args.status) as CronScheduleUpdateRequest['status'],
		timezone: optionalString(args.timezone),
		cronExpression: optionalString(args.cronExpression),
		intervalMs: numberValue(args.intervalMs),
		runAt: optionalString(args.runAt),
		startAt: optionalString(args.startAt),
		endAt: optionalString(args.endAt),
		target: optionalString(args.target),
		payload: args.payload === undefined ? undefined : jsonValue(args.payload, {}),
		taskType: optionalString(args.taskType),
		taskInput: args.taskInput === undefined ? undefined : jsonValue(args.taskInput, {}),
		enabled: typeof args.enabled === 'boolean' ? args.enabled : undefined,
		metadata: args.metadata === undefined ? undefined : jsonValue(args.metadata, {}) as CronJsonObject,
		confirmed: true,
	};
}

const scheduleSchema: JSONSchema = {
	type: 'object',
	required: ['name'],
	properties: {
		name: { type: 'string' },
		description: { type: 'string' },
		type: { type: 'string', enum: ['cron', 'interval', 'oneTime', 'manual'] },
		cronExpression: { type: 'string' },
		intervalMs: { type: 'number' },
		runAt: { type: 'string' },
		timezone: { type: 'string' },
		taskType: { type: 'string' },
		taskInput: { type: 'object' },
		enabled: { type: 'boolean' },
	},
};

const idSchema: JSONSchema = {
	type: 'object',
	required: ['scheduleId'],
	properties: { scheduleId: { type: 'string' } },
};

export const cronCreateTool: AgentTool = {
	name: 'cron_create',
	description: 'Create a new cron schedule.',
	schema: scheduleSchema,
	async execute(args, ctx) {
		return jsonResult(await cronService(ctx).createSchedule(createRequest(args, ctx), actor(ctx)));
	},
};

export const cronReadTool: AgentTool = {
	name: 'cron_read',
	description: 'Read a cron schedule by identifier.',
	schema: idSchema,
	async execute(args, ctx) {
		return jsonResult(await cronService(ctx).getSchedule(scheduleId(args), actor(ctx)));
	},
};

export const cronUpdateTool: AgentTool = {
	name: 'cron_update',
	description: 'Update an existing cron schedule.',
	schema: { ...scheduleSchema, required: ['scheduleId'], properties: { ...scheduleSchema.properties, scheduleId: { type: 'string' } } },
	async execute(args, ctx) {
		return jsonResult(await cronService(ctx).updateSchedule(scheduleId(args), updateRequest(args), actor(ctx)));
	},
};

export const cronDeleteTool: AgentTool = {
	name: 'cron_delete',
	description: 'Delete a cron schedule.',
	schema: idSchema,
	async execute(args, ctx) {
		await cronService(ctx).deleteSchedule(scheduleId(args), actor(ctx));
		return jsonResult({ deleted: scheduleId(args) });
	},
};

export const cronListTool: AgentTool = {
	name: 'cron_list',
	description: 'List existing cron schedules.',
	schema: {
		type: 'object',
		properties: {
			status: { type: 'string' },
			limit: { type: 'number' },
		},
	},
	async execute(args, ctx) {
		return jsonResult(await cronService(ctx).listSchedules({ status: optionalString(args.status) as CronScheduleFilter['status'], limit: numberValue(args.limit) }, actor(ctx)));
	},
};

export const cronStartTool: AgentTool = {
	name: 'cron_start',
	description: 'Start a paused cron schedule.',
	schema: idSchema,
	async execute(args, ctx) {
		await cronService(ctx).resumeSchedule(scheduleId(args), actor(ctx));
		return jsonResult({ started: scheduleId(args) });
	},
};

export const cronStopTool: AgentTool = {
	name: 'cron_stop',
	description: 'Stop a running cron schedule.',
	schema: idSchema,
	async execute(args, ctx) {
		await cronService(ctx).pauseSchedule(scheduleId(args), actor(ctx));
		return jsonResult({ stopped: scheduleId(args) });
	},
};

export const cronRunTool: AgentTool = {
	name: 'cron_run',
	description: 'Run a cron schedule immediately.',
	schema: idSchema,
	async execute(args, ctx) {
		return jsonResult(await cronService(ctx).runScheduleNow(scheduleId(args), actor(ctx)));
	},
};

export const cronTools = [
	cronCreateTool,
	cronReadTool,
	cronUpdateTool,
	cronDeleteTool,
	cronListTool,
	cronStartTool,
	cronStopTool,
	cronRunTool,
] as const;
