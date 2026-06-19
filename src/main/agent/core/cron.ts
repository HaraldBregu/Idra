import type { JSONSchema } from './types';

export type CronStoredSchedule = string | CronJsonObject;
export type CronStoredTarget = 'job' | 'tool' | 'task' | 'agent' | string;
export type CronStoredRunStatus = 'success' | 'failure' | 'skipped';

export type CronScheduleId = string;

export type CronScheduleStatus =
	| 'active'
	| 'paused'
	| 'disabled'
	| 'expired'
	| 'completed'
	| 'failed'
	| 'deleted';

export type CronScheduleType =
	| 'cron'
	| 'interval'
	| 'fixedRate'
	| 'fixedDelay'
	| 'oneTime'
	| 'calendar'
	| 'manual';

export type CronScheduleSource =
	| 'agent'
	| 'skill'
	| 'tool'
	| 'connector'
	| 'api'
	| 'ui'
	| 'system'
	| 'migration'
	| 'maintenance';

export type CronScheduleVisibility = 'private' | 'user' | 'workspace' | 'system';

export type CronSchedulePermissionLevel =
	| 'createSchedule'
	| 'updateSchedule'
	| 'deleteSchedule'
	| 'pauseSchedule'
	| 'resumeSchedule'
	| 'listSchedules'
	| 'runScheduleNow'
	| 'scheduleReadPrivateData'
	| 'scheduleWritePrivateData'
	| 'scheduleWriteExternal'
	| 'scheduleDeleteData'
	| 'scheduleConnectorAccess'
	| 'scheduleNetworkAccess'
	| 'scheduleFileSystemAccess'
	| 'adminScheduleManagement';

export type CronExpression = string;
export type CronTimezone = string;

export type CronMissedRunPolicy = 'skip' | 'runOnce' | 'catchUp' | 'fail' | 'askUser';

export type CronConcurrencyPolicy =
	| 'allowOverlap'
	| 'skipIfRunning'
	| 'queueIfRunning'
	| 'cancelPrevious'
	| 'replacePrevious';

export type CronScheduleEventType =
	| 'schedule.created'
	| 'schedule.updated'
	| 'schedule.paused'
	| 'schedule.resumed'
	| 'schedule.deleted'
	| 'schedule.loaded'
	| 'schedule.recovered'
	| 'schedule.due'
	| 'schedule.triggered'
	| 'schedule.skipped'
	| 'schedule.missed'
	| 'schedule.failed'
	| 'schedule.completed'
	| 'schedule.permissionDenied'
	| 'schedule.nextRunUpdated';

export type CronTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type CronScheduledTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type CronJsonValue =
	| string
	| number
	| boolean
	| null
	| CronJsonValue[]
	| { [key: string]: CronJsonValue };

export type CronJsonObject = Record<string, CronJsonValue>;

export interface CronJobInfo {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly expression: string;
	readonly timezone?: string;
	readonly enabled: boolean;
	readonly status: CronScheduleStatus;
	readonly target?: CronStoredTarget;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CronScheduledTask {
	id: string;
	type: string;
	title: string;
	description?: string;
	source: 'cron';
	sourceId: CronScheduleId;
	userId?: string;
	sessionId?: string;
	input: CronJsonValue;
	status: CronScheduledTaskStatus;
	priority: CronTaskPriority;
	visibility: CronScheduleVisibility;
	tags: string[];
	metadata: CronJsonObject;
	createdAt: string;
	updatedAt: string;
}

export interface CronRetryPolicy {
	maxAttempts: number;
	initialDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
	jitter: boolean;
	retryableErrorCodes: string[];
	nonRetryableErrorCodes: string[];
}

export interface CronConfirmationPolicy {
	confirmationId?: string;
	actionSummary: string;
	scheduleSummary: string;
	dataAccessSummary: string;
	externalEffectSummary: string;
	risks: string[];
	confirmedAt?: string;
	confirmedBy?: string;
	expiresAt?: string;
}

export interface CronScheduleAuditEntry {
	auditId: string;
	scheduleId: CronScheduleId;
	action: string;
	actor: CronScheduleSource | 'cron-scheduler' | 'cron-ipc' | 'agent-cron-service';
	message: string;
	createdAt: string;
	metadata: CronJsonObject;
}

export interface CronScheduleDefinition {
	id: CronScheduleId;
	name: string;
	description?: string;
	schedule?: CronStoredSchedule;
	type: CronScheduleType;
	status: CronScheduleStatus;
	source: CronScheduleSource;
	sourceId?: string;
	ownerUserId?: string;
	sessionId?: string;
	createdBy: string;
	visibility: CronScheduleVisibility;
	timezone: CronTimezone;
	cronExpression?: CronExpression;
	intervalMs?: number;
	runAt?: string;
	startAt?: string;
	endAt?: string;
	maxRuns?: number;
	runCount: number;
	lastRunAt?: string;
	nextRunAt?: string;
	lastRunStatus?: CronStoredRunStatus;
	lastError?: string;
	lastSuccessfulRunAt?: string;
	lastFailedRunAt?: string;
	lastEvaluatedAt?: string;
	failureCount?: number;
	missedRunPolicy: CronMissedRunPolicy;
	maxCatchUpRuns?: number;
	catchUpWindowMs?: number;
	concurrencyPolicy: CronConcurrencyPolicy;
	retryPolicy: CronRetryPolicy;
	providerId?: string;
	modelId?: string;
	target?: CronStoredTarget;
	payload?: CronJsonValue;
	taskType: string;
	taskInput: CronJsonValue;
	taskPriority: CronTaskPriority;
	taskTags: string[];
	taskMetadata: CronJsonObject;
	requiredPermissions: CronSchedulePermissionLevel[];
	requiresConfirmation: boolean;
	confirmationPolicy?: CronConfirmationPolicy;
	enabled: boolean;
	pausedAt?: string;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string;
	metadata: CronJsonObject;
	audit: CronScheduleAuditEntry[];
}

export type CronSchedule = CronScheduleDefinition;

export interface CronScheduleCreateRequest {
	name: string;
	description?: string;
	schedule?: CronStoredSchedule;
	type: CronScheduleType;
	source: CronScheduleSource;
	sourceId?: string;
	ownerUserId?: string;
	sessionId?: string;
	createdBy: string;
	visibility?: CronScheduleVisibility;
	timezone: CronTimezone;
	cronExpression?: CronExpression;
	intervalMs?: number;
	runAt?: string;
	startAt?: string;
	endAt?: string;
	maxRuns?: number;
	missedRunPolicy?: CronMissedRunPolicy;
	maxCatchUpRuns?: number;
	catchUpWindowMs?: number;
	concurrencyPolicy?: CronConcurrencyPolicy;
	retryPolicy?: Partial<CronRetryPolicy>;
	providerId?: string;
	modelId?: string;
	target?: CronStoredTarget;
	payload?: CronJsonValue;
	taskType: string;
	taskInput: CronJsonValue;
	taskPriority?: CronTaskPriority;
	taskTags?: string[];
	taskMetadata?: CronJsonObject;
	requiredPermissions?: CronSchedulePermissionLevel[];
	requiresConfirmation?: boolean;
	confirmationPolicy?: CronConfirmationPolicy;
	enabled?: boolean;
	metadata?: CronJsonObject;
	confirmed?: boolean;
}

export interface CronScheduleFilter {
	status?: CronScheduleStatus | CronScheduleStatus[];
	source?: CronScheduleSource | CronScheduleSource[];
	sourceId?: string;
	ownerUserId?: string;
	sessionId?: string;
	visibility?: CronScheduleVisibility | CronScheduleVisibility[];
	taskType?: string;
	tag?: string;
	includeDeleted?: boolean;
	limit?: number;
}

export interface CronScheduleEvent {
	eventId: string;
	scheduleId: CronScheduleId;
	type: CronScheduleEventType;
	userId?: string;
	source: CronScheduleSource;
	timestamp: string;
	message: string;
	metadata: CronJsonObject;
}

export interface CronActorContext {
	source?: string;
	userId?: string;
	sessionId?: string;
	timezone?: string;
	permissions?: CronSchedulePermissionLevel[];
}

export type CronFunctionId =
	| 'create_schedule'
	| 'pause_schedule'
	| 'resume_schedule'
	| 'delete_schedule'
	| 'get_schedule'
	| 'list_schedules'
	| 'run_schedule_now';

export interface CronFunctionDefinition {
	id: CronFunctionId;
	name: string;
	description: string;
}

export interface CronFunctionInput {
	create_schedule: { request: CronScheduleCreateRequest };
	pause_schedule: { scheduleId: string };
	resume_schedule: { scheduleId: string };
	delete_schedule: { scheduleId: string };
	get_schedule: { scheduleId: string };
	list_schedules: { filter?: CronScheduleFilter };
	run_schedule_now: { scheduleId: string };
}

export interface CronFunctionResult {
	create_schedule: CronSchedule;
	pause_schedule: void;
	resume_schedule: void;
	delete_schedule: void;
	get_schedule: CronSchedule;
	list_schedules: CronSchedule[];
	run_schedule_now: CronScheduledTask;
}

export interface CronEvents {
	subscribe(listener: (event: CronScheduleEvent) => void): () => void;
}

export abstract class Cron {
	abstract get events(): CronEvents;
	abstract get functions(): CronFunctionDefinition[];

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
	abstract destroy(): void;

	abstract createSchedule(request: CronScheduleCreateRequest, actor?: CronActorContext): CronSchedule;
	abstract pauseSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract resumeSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract deleteSchedule(scheduleId: string, actor?: CronActorContext): void;
	abstract getSchedule(scheduleId: string, actor?: CronActorContext): CronSchedule;
	abstract listSchedules(filter?: CronScheduleFilter, actor?: CronActorContext): CronSchedule[];
	abstract runScheduleNow(scheduleId: string, actor?: CronActorContext): CronScheduledTask;

	abstract invoke<K extends CronFunctionId>(
		id: K,
		input: CronFunctionInput[K],
		actor?: CronActorContext
	): CronFunctionResult[K];

	abstract listJobs(): CronJobInfo[];
	abstract deleteJob(id: string): void;
}
