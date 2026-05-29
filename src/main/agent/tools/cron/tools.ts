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
		const denied = checkCronPolicy(ctx, 'cron_run', args);
		if (denied) return textResult(denied, true);
		const service = cronService(ctx);
		if (!service) return textResult('cron_run: CronService is unavailable.', true);
		try {
			return jsonText(await service.runScheduleNow(args.id, cronActor(ctx)));
		} catch (err) {
			return textResult(`cron_run: ${(err as Error).message}`, true);
		}
	},
};

type CronCompatAction = 'status' | 'list' | 'get' | 'add' | 'update' | 'remove' | 'run' | 'runs';

interface CronCompatArgs {
	action: CronCompatAction;
	jobId?: string;
	id?: string;
	includeDisabled?: boolean;
	filter?: CronScheduleFilter;
	job?: CronScheduleCreateRequest;
	patch?: CronScheduleUpdateRequest;
	name?: string;
	description?: string;
	enabled?: boolean;
	deleteAfterRun?: boolean;
	type?: CronScheduleType;
	timezone?: string;
	cronExpression?: string;
	cron?: string;
	expr?: string;
	intervalMs?: number;
	runAt?: string;
	startAt?: string;
	endAt?: string;
	maxRuns?: number;
	taskType?: string;
	taskInput?: CronJsonValue;
	confirmed?: boolean;
}

export const cronTool: AgentTool<CronCompatArgs> = {
	name: 'cron',
	ownerOnly: true,
	displaySummary: 'Schedule cron jobs, reminders, and wake events.',
	description:
		'Manage scheduled jobs through CronService. Use this only for future, delayed, recurring, reminder, wake, or manual-run scheduling. Do not use this to start immediate in-memory task execution.',
	schema: {
		type: 'object',
		properties: {
			action: {
				type: 'string',
				enum: ['status', 'list', 'get', 'add', 'update', 'remove', 'run', 'runs'],
			},
			jobId: { type: 'string', description: 'Canonical cron job id.' },
			id: { type: 'string', description: 'Compatibility alias for jobId.' },
			includeDisabled: { type: 'boolean' },
			filter: { type: 'object', additionalProperties: true },
			job: { type: 'object', additionalProperties: true },
			patch: { type: 'object', additionalProperties: true },
			name: { type: 'string' },
			description: { type: 'string' },
			enabled: { type: 'boolean' },
			deleteAfterRun: { type: 'boolean' },
			type: {
				type: 'string',
				enum: ['cron', 'interval', 'fixedRate', 'fixedDelay', 'oneTime', 'calendar', 'manual'],
			},
			timezone: { type: 'string' },
			cronExpression: { type: 'string' },
			cron: { type: 'string' },
			expr: { type: 'string' },
			intervalMs: { type: 'number' },
			runAt: { type: 'string' },
			startAt: { type: 'string' },
			endAt: { type: 'string' },
			maxRuns: { type: 'number' },
			taskType: { type: 'string' },
			taskInput: {},
			confirmed: { type: 'boolean' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	needsApproval: (args) => ['add', 'update', 'remove', 'run'].includes(args.action),
	async execute(args, ctx) {
		const service = cronService(ctx);
		if (!service) return textResult('cron: CronService is unavailable.', true);
		try {
			const actor = cronActor(ctx, args);
			if (args.action === 'status') {
				return jsonText({ ok: true, service: 'CronService' });
			}
			if (args.action === 'list') {
				return jsonText(await service.listSchedules(args.filter ?? {}, actor));
			}
			if (args.action === 'get') {
				return jsonText(await service.getSchedule(requireCronId(args), actor));
			}
			if (args.action === 'add') {
				return jsonText(await service.createSchedule(cronCreateRequest(args, ctx), actor));
			}
			if (args.action === 'update') {
				return jsonText(await service.updateSchedule(requireCronId(args), args.patch ?? {}, actor));
			}
			if (args.action === 'remove') {
				await service.deleteSchedule(requireCronId(args), actor);
				return textResult(`removed cron schedule ${requireCronId(args)}`);
			}
			if (args.action === 'run') {
				return jsonText(await service.runScheduleNow(requireCronId(args), actor));
			}
			if (args.action === 'runs') {
				return jsonText(await service.getScheduleExecutions(requireCronId(args)));
			}
			return textResult(`cron: unsupported action ${String(args.action)}`, true);
		} catch (err) {
			return textResult(`cron: ${(err as Error).message}`, true);
		}
	},
};

function requireCronId(args: CronCompatArgs): string {
	const id = (args.jobId ?? args.id ?? '').trim();
	if (!id) throw new Error('jobId is required.');
	return id;
}

function cronCreateRequest(args: CronCompatArgs, ctx: ToolContext): CronScheduleCreateRequest {
	if (args.job) return args.job;
	if (!args.taskType) throw new Error('taskType is required for cron add.');
	if (args.taskInput === undefined) throw new Error('taskInput is required for cron add.');
	const type = args.type ?? (args.runAt ? 'oneTime' : args.intervalMs ? 'interval' : 'cron');
	return {
		name: args.name ?? args.jobId ?? args.id ?? 'Scheduled job',
		description: args.description,
		type,
		source: 'tool',
		sourceId: ctx.sessionId,
		sessionId: ctx.sessionId,
		createdBy: ctx.agentId ?? ctx.sessionId,
		timezone: args.timezone,
		cronExpression: args.cronExpression ?? args.expr ?? args.cron,
		intervalMs: args.intervalMs,
		runAt: args.runAt,
		startAt: args.startAt,
		endAt: args.endAt,
		maxRuns: args.maxRuns,
		taskType: args.taskType,
		taskInput: args.taskInput,
		enabled: args.enabled,
	};
}

function checkCronPolicy(ctx: ToolContext, toolName: string, params: unknown): string | null {
	const policy = ctx.services.policy;
	if (!policy) return null;
	try {
		const decision = policy.evaluateToolUse({ toolName, params, callCount: 1 });
		return decision.outcome === 'allow' ? null : decision.reason;
	} catch (err) {
		return `${toolName}: cron policy unavailable: ${(err as Error).message}`;
	}
}

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
