import type { CronService, CronServiceActor } from '../../../cron';
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
import type { ToolContext } from '../base/tool';
import { textResult } from '../base/tool';

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

export interface CronCreateArgs {
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

export interface CronReadArgs {
	id: string;
}

export interface CronUpdateArgs {
	id: string;
	patch: CronScheduleUpdateRequest;
}

export interface CronListArgs {
	filter?: CronScheduleFilter;
}

export type CronCompatAction =
	| 'status'
	| 'list'
	| 'get'
	| 'add'
	| 'update'
	| 'remove'
	| 'run'
	| 'runs';

export interface CronCompatArgs {
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

export const cronCreateSchema = {
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

export const cronIdSchema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
	},
	required: ['id'],
	additionalProperties: false,
};

export function requireCronId(args: CronCompatArgs): string {
	const id = (args.jobId ?? args.id ?? '').trim();
	if (!id) throw new Error('jobId is required.');
	return id;
}

export function cronCreateRequest(
	args: CronCompatArgs,
	ctx: ToolContext
): CronScheduleCreateRequest {
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
		timezone: args.timezone ?? cronActor(ctx, args).timezone,
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

export function checkCronPolicy(ctx: ToolContext, toolName: string, params: unknown): string | null {
	const policy = ctx.services.policy;
	if (!policy) return null;
	try {
		const decision = policy.evaluateToolUse({ toolName, params, callCount: 1 });
		return decision.outcome === 'allow' ? null : decision.reason;
	} catch (err) {
		return `${toolName}: cron policy unavailable: ${(err as Error).message}`;
	}
}

export function cronService(ctx: ToolContext): CronService | undefined {
	return ctx.services.cron;
}

export function cronActor(
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

export function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}
