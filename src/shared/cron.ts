/**
 * Base shape every cron task payload must satisfy: a string `type`
 * discriminator chosen by the caller at task creation. Concrete data shapes
 * extend this with whatever extra fields they need. New variants are added
 * by declaring them at the call site — no central registry to update.
 */
export interface CronTaskData<TType extends string = string> {
	readonly type: TType;
}

export interface CronTaskAgentData extends CronTaskData<'agent'> {
	readonly prompt: string;
}

export interface CronTaskAppData extends CronTaskData<'app'> {
	readonly action: string;
	readonly payload?: Record<string, unknown>;
}

export interface CronTaskMessageData extends CronTaskData<'message'> {
	readonly message: string;
}

export type CronStoredSchedule = string | CronJsonObject;
export type CronStoredTarget = 'job' | 'tool' | 'task' | 'agent' | string;
export type CronStoredRunStatus = 'success' | 'failure' | 'skipped';

export interface CronTask<TData extends CronTaskData = CronTaskData> {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly schedule: CronStoredSchedule;
	readonly expression: string;
	readonly timezone: string;
	readonly enabled: boolean;
	readonly status: CronScheduleStatus;
	readonly providerId?: string;
	readonly modelId?: string;
	readonly target: CronStoredTarget;
	readonly payload: TData;
	readonly data: TData;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly lastRunAt?: string;
	readonly nextRunAt?: string;
	readonly lastRunStatus?: CronStoredRunStatus;
	readonly lastError?: string;
	readonly runCount: number;
	readonly failureCount: number;
	readonly lastRun?: string;
}

export interface CronTaskView<TData extends CronTaskData = CronTaskData> extends CronTask<TData> {
	readonly nextRun?: string;
}

export interface CronJobInfo {
	readonly id: string;
	readonly expression: string;
}

export interface CronTickEvent {
	readonly id: string;
	readonly firedAt: string;
}

export function isCronTaskData(value: unknown): value is CronTaskData {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { type?: unknown }).type === 'string'
	);
}

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

export type CronExecutionStatus =
	| 'created'
	| 'skipped'
	| 'taskCreated'
	| 'taskCompleted'
	| 'taskFailed'
	| 'cancelled'
	| 'duplicateIgnored';

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

export type CronDstPolicy =
	| 'skipNonexistentTime'
	| 'shiftForward'
	| 'runAtNextValidTime'
	| 'runOnceForRepeatedHour';

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

export interface CronRunPolicy {
	maxCatchUpRuns: number;
	catchUpWindowMs: number;
	minIntervalMs: number;
	maxRunsPerTurn: number;
	highFrequencyThresholdMs: number;
	dstPolicy: CronDstPolicy;
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
	actor: CronScheduleSource | 'cron-scheduler' | 'cron-ipc';
	message: string;
	createdAt: string;
	metadata: CronJsonObject;
}

export interface CronScheduleDefinition {
	id: CronScheduleId;
	name: string;
	description?: string;
	schedule: CronStoredSchedule;
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
	failureCount: number;
	missedRunPolicy: CronMissedRunPolicy;
	maxCatchUpRuns?: number;
	catchUpWindowMs?: number;
	concurrencyPolicy: CronConcurrencyPolicy;
	retryPolicy: CronRetryPolicy;
	providerId?: string;
	modelId?: string;
	target: CronStoredTarget;
	payload: CronJsonValue;
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

export interface CronScheduleUpdateRequest {
	name?: string;
	description?: string;
	schedule?: CronStoredSchedule;
	status?: Exclude<CronScheduleStatus, 'deleted'>;
	visibility?: CronScheduleVisibility;
	timezone?: CronTimezone;
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
	taskType?: string;
	taskInput?: CronJsonValue;
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

export interface CronExecutionRecord {
	executionId: string;
	scheduleId: CronScheduleId;
	idempotencyKey: string;
	scheduledRunAt: string;
	triggeredAt: string;
	taskId?: string;
	status: CronExecutionStatus;
	missedRun: boolean;
	runNumber: number;
	completedAt?: string;
	failedAt?: string;
	error?: {
		code: string;
		message: string;
		safeUserMessage: string;
		retryable: boolean;
		metadata?: CronJsonObject;
	};
	metadata: CronJsonObject;
}

export interface CronScheduleConfirmation {
	confirmationId: string;
	scheduleId?: CronScheduleId;
	proposedScheduleRequest: CronScheduleCreateRequest;
	userId?: string;
	actionSummary: string;
	scheduleSummary: string;
	dataAccessSummary: string;
	externalEffectSummary: string;
	risks: string[];
	expiresAt: string;
	createdAt: string;
}

export interface CronValidationResult {
	valid: boolean;
	message?: string;
	normalizedExpression?: string;
}

export interface CronNextRunPreview {
	scheduleId: CronScheduleId;
	runs: string[];
	description: string;
}
