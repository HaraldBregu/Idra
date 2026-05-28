import type { CronService, CronServiceActor } from '../../../cron';
import type { AgentTool, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import type {
	CronJsonValue,
	CronScheduleCreateRequest,
	CronScheduleFilter,
	CronSchedulePermissionLevel,
	CronScheduleSource,
	CronScheduleType,
	CronScheduleUpdateRequest,
	CronScheduleVisibility,
} from '../../../../shared/cron';

const CRON_TOOL_PERMISSIONS: CronSchedulePermissionLevel[] = [
	'createSchedule',
	'updateSchedule',
	'deleteSchedule',
	'pauseSchedule',
	'resumeSchedule',
	'listSchedules',
	'runScheduleNow',
	'scheduleReadPrivateData',
	'scheduleWritePrivateData',
	'scheduleWriteExternal',
	'scheduleDeleteData',
	'scheduleConnectorAccess',
	'scheduleNetworkAccess',
	'scheduleFileSystemAccess',
];

interface CronCreateArgs {
	name: string;
	description?: string;
	type: CronScheduleType;
	source?: CronScheduleSource;
	sourceId?: string;
	ownerUserId?: string;
	sessionId?: string;
	createdBy?: string;
	visibility?: CronScheduleVisibility;
	timezone?: string;
	cronExpression?: string;
	intervalMs?: number;
	runAt?: string;
	startAt?: string;
	endAt?: string;
	maxRuns?: number;
	taskType: string;
	taskInput: CronJsonValue;
	enabled?: boolean;
	confirmed?: boolean;
}

interface CronReadArgs {
	id: string;
}

interface CronUpdateArgs {
	id: string;
	patch: CronScheduleUpdateRequest;
}

interface CronListArgs {
	filter?: CronScheduleFilter;
}

const cronCreateSchema = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		description: { type: 'string' },
		type: {
			type: 'string',
			enum: ['cron', 'interval', 'fixedRate', 'fixedDelay', 'oneTime', 'calendar', 'manual'],
		},
		source: { type: 'string' },
		sourceId: { type: 'string' },
		ownerUserId: { type: 'string' },
		sessionId: { type: 'string' },
		createdBy: { type: 'string' },
		visibility: { type: 'string', enum: ['private', 'user', 'workspace', 'system'] },
		timezone: { type: 'string' },
		cronExpression: { type: 'string' },
		intervalMs: { type: 'number' },
		runAt: { type: 'string' },
		startAt: { type: 'string' },
		endAt: { type: 'string' },
		maxRuns: { type: 'number' },
		taskType: { type: 'string' },
		taskInput: {},
		enabled: { type: 'boolean' },
		confirmed: { type: 'boolean' },
	},
	required: ['name', 'type', 'taskType', 'taskInput'],
	additionalProperties: false,
};

const cronIdSchema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
	},
	required: ['id'],
	additionalProperties: false,
};

export const cronCreateTool: AgentTool<CronCreateArgs> = {
	name: 'cron_create',
	description: 'Create a scheduled job through CronService.',
	schema: cronCreateSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_create', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_create: CronService is unavailable.', true);
		const actor = cronActor(ctx, args);
		const request: CronScheduleCreateRequest = {
			...args,
			source: args.source ?? 'tool',
			sourceId: args.sourceId ?? ctx.sessionId,
			ownerUserId: args.ownerUserId ?? actor.userId,
			sessionId: args.sessionId ?? ctx.sessionId,
			createdBy: args.createdBy ?? ctx.agentId ?? ctx.sessionId,
			timezone: args.timezone ?? actor.timezone,
		};
		try {
			return jsonText(await service.createSchedule(request, actor));
		} catch (err) {
			return textResult(`cron_create: ${(err as Error).message}`, true);
		}
	},
};

export const cronReadTool: AgentTool<CronReadArgs> = {
	name: 'cron_read',
	description: 'Read a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_read', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_read: CronService is unavailable.', true);
		try {
			return jsonText(await service.getSchedule(args.id, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_read: ${(err as Error).message}`, true);
		}
	},
};

export const cronUpdateTool: AgentTool<CronUpdateArgs> = {
	name: 'cron_update',
	description: 'Update a scheduled job through CronService.',
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			patch: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'patch'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_update', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_update: CronService is unavailable.', true);
		try {
			return jsonText(await service.updateSchedule(args.id, args.patch, cronActor(ctx, args.patch)));
		} catch (err) {
			return textResult(`cron_update: ${(err as Error).message}`, true);
		}
	},
};

export const cronDeleteTool: AgentTool<CronReadArgs> = {
	name: 'cron_delete',
	description: 'Delete a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_delete', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_delete: CronService is unavailable.', true);
		try {
			await service.deleteSchedule(args.id, cronActor(ctx));
			return textResult(`deleted cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_delete: ${(err as Error).message}`, true);
		}
	},
};

export const cronListTool: AgentTool<CronListArgs> = {
	name: 'cron_list',
	description: 'List scheduled jobs through CronService.',
	schema: {
		type: 'object',
		properties: {
			filter: { type: 'object', additionalProperties: true },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_list', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_list: CronService is unavailable.', true);
		try {
			return jsonText(await service.listSchedules(args.filter ?? {}, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_list: ${(err as Error).message}`, true);
		}
	},
};

export const cronStartTool: AgentTool<CronReadArgs> = {
	name: 'cron_start',
	description: 'Start a paused scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_start', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_start: CronService is unavailable.', true);
		try {
			await service.resumeSchedule(args.id, cronActor(ctx));
			return textResult(`started cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_start: ${(err as Error).message}`, true);
		}
	},
};

export const cronStopTool: AgentTool<CronReadArgs> = {
	name: 'cron_stop',
	description: 'Stop a scheduled job through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const denied = checkCronPolicy(ctx, 'cron_stop', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_stop: CronService is unavailable.', true);
		try {
			await service.pauseSchedule(args.id, cronActor(ctx));
			return textResult(`stopped cron schedule ${args.id}`);
		} catch (err) {
			return textResult(`cron_stop: ${(err as Error).message}`, true);
		}
	},
};

export const cronRunTool: AgentTool<CronReadArgs> = {
	name: 'cron_run',
	description: 'Run a scheduled job immediately through CronService.',
	schema: cronIdSchema,
	async execute(args, ctx) {
		const service = cronService(ctx);
		if (!service) return textResult('cron_run: CronService is unavailable.', true);
		try {
			return jsonText(await service.runScheduleNow(args.id, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_run: ${(err as Error).message}`, true);
		}
	},
};

function cronService(ctx: ToolContext): CronService | undefined {
	return ctx.services.cron;
}

function cronActor(
	ctx: ToolContext,
	input?: { ownerUserId?: string; timezone?: string; confirmed?: boolean }
): CronServiceActor {
	return {
		source: 'tool',
		sourceId: ctx.agentId ?? ctx.sessionId,
		userId: input?.ownerUserId ?? ctx.agentId ?? ctx.sessionId,
		sessionId: ctx.sessionId,
		timezone: (input?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC',
		permissions: CRON_TOOL_PERMISSIONS,
		confirmed: input?.confirmed,
		metadata: { toolSessionId: ctx.sessionId },
	};
}

function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}
