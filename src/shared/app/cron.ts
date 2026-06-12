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

export interface CronStoreState {
	schemaVersion: number;
	configuration: {
		enabled?: boolean;
	};
	schedules: CronSchedule[];
	events: CronScheduleEvent[];
	executions: CronExecutionRecord[];
	locks: Record<string, { runnerId: string; expiresAt: string }>;
	confirmations: CronScheduleConfirmation[];
	quarantined: CronJsonObject[];
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

export type FridayCronSchedule =
	| { kind: 'at'; at: string }
	| { kind: 'every'; everyMs: number; anchorMs?: number }
	| {
			kind: 'cron';
			expr: string;
			tz?: string;
			staggerMs?: number;
	  };

export type FridayCronSessionTarget = 'main' | 'isolated' | 'current' | `session:${string}`;

export type FridayCronWakeMode = 'now' | 'next-heartbeat';
export const CRON_DEFERRED_WAKE_MODE: FridayCronWakeMode = 'next-heartbeat';
export const FRIDAY_CRON_DEFERRED_WAKE_MODE = CRON_DEFERRED_WAKE_MODE;

export type FridayCronPayload =
	| { kind: 'systemEvent'; text: string }
	| {
			kind: 'agentTurn';
			message: string;
			fallbacks?: string[];
			thinking?: 'low' | 'medium' | 'high';
			timeoutSeconds?: number;
			lightContext?: boolean;
			toolsAllow?: string[];
			allowUnsafeExternalContent?: boolean;
	  };

export interface FridayCronDeliveryTarget {
	channel?: 'last' | string;
	to?: string;
	threadId?: string;
	accountId?: string;
}

export interface FridayCronDelivery extends FridayCronDeliveryTarget {
	mode: 'announce' | 'webhook' | 'none';
	bestEffort?: boolean;
	failureDestination?: FridayCronDeliveryTarget & {
		mode?: 'announce' | 'webhook' | 'none';
	};
}

export interface FridayCronFailureAlert {
	after?: number;
	cooldownMs?: number;
	mode?: 'announce' | 'webhook' | 'none';
	channel?: string;
	to?: string;
	threadId?: string;
	accountId?: string;
	includeSkipped?: boolean;
}

export interface FridayCronDeliveryState {
	mode: FridayCronDelivery['mode'];
	status: 'sent' | 'skipped' | 'failed';
	attemptedAtMs: number;
	target?: FridayCronDeliveryTarget;
	error?: string;
	duplicateSuppressed?: boolean;
}

export interface FridayCronRunError {
	code: string;
	message: string;
	permanent?: boolean;
}

export type FridayCronRunStatus = 'ok' | 'error' | 'skipped';

export interface FridayCronJobState {
	nextRunAtMs?: number;
	runningAtMs?: number;
	lastRunAtMs?: number;
	lastRunStatus?: FridayCronRunStatus;
	lastError?: FridayCronRunError;
	diagnostics?: CronJsonObject;
	delivery?: FridayCronDeliveryState;
	consecutiveErrors: number;
	consecutiveSkipped: number;
	consecutiveScheduleErrors: number;
	attempts: number;
	scheduleIdentity?: string;
	lastFailureAlertAtMs?: number;
}

export interface FridayCronJobDefinition {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	createdAtMs: number;
	updatedAtMs: number;
	schedule: FridayCronSchedule;
	sessionTarget: FridayCronSessionTarget;
	wakeMode: FridayCronWakeMode;
	payload: FridayCronPayload;
	delivery: FridayCronDelivery;
	failureAlert?: FridayCronFailureAlert | false;
	agentId?: string | null;
	sessionKey?: string | null;
	deleteAfterRun?: boolean;
	maxAttempts?: number;
	backoffMs?: number;
	maxBackoffMs?: number;
}

export interface FridayCronJob extends FridayCronJobDefinition {
	state: FridayCronJobState;
}

export interface FridayCronRunRecord {
	runId: string;
	jobId: string;
	status: FridayCronRunStatus;
	mode: 'automatic' | 'manual-force' | 'manual-due' | 'startup-recovery';
	scheduledForMs: number;
	startedAtMs: number;
	finishedAtMs: number;
	attempt: number;
	output?: string;
	skippedReason?: string;
	error?: FridayCronRunError;
	delivery?: FridayCronDeliveryState;
	alreadyDelivered?: boolean;
}

export interface FridayCronAddRequest {
	id?: string;
	name: string;
	description?: string;
	enabled?: boolean;
	schedule: FridayCronSchedule;
	sessionTarget?: FridayCronSessionTarget;
	wakeMode?: FridayCronWakeMode;
	payload: FridayCronPayload;
	delivery?: Partial<FridayCronDelivery>;
	failureAlert?: FridayCronFailureAlert | false;
	agentId?: string | null;
	sessionKey?: string | null;
	deleteAfterRun?: boolean;
	maxAttempts?: number;
	backoffMs?: number;
	maxBackoffMs?: number;
}

export type FridayCronUpdateRequest = Partial<
	Omit<FridayCronAddRequest, 'id' | 'name' | 'payload' | 'schedule' | 'delivery'>
> & {
	name?: string;
	payload?: FridayCronPayload;
	schedule?: FridayCronSchedule;
	delivery?: Partial<FridayCronDelivery>;
};

export type FridayCronToolAction =
	| 'status'
	| 'list'
	| 'get'
	| 'add'
	| 'update'
	| 'remove'
	| 'run'
	| 'runs'
	| 'wake';

export interface FridayCronToolRequest {
	action: FridayCronToolAction;
	jobId?: string;
	id?: string;
	job?: FridayCronAddRequest | Record<string, unknown>;
	patch?: FridayCronUpdateRequest | Record<string, unknown>;
	include?: 'enabled' | 'disabled' | 'all';
	includeDisabled?: boolean;
	agentId?: string | null;
	contextMessages?: number;
	timeoutMs?: number;
	runMode?: 'force' | 'due';
	mode?: 'force' | 'due' | 'now' | 'next-heartbeat';
	force?: boolean;
	limit?: number;
	text?: string;
	[key: string]: unknown;
}

export type FridayCronCanonicalToolRequest =
	| { action: 'status' }
	| { action: 'list'; include?: 'enabled' | 'disabled' | 'all'; agentId?: string | null }
	| { action: 'get'; jobId: string }
	| { action: 'add'; job: FridayCronAddRequest }
	| { action: 'update'; jobId: string; patch: FridayCronUpdateRequest }
	| { action: 'remove'; jobId: string }
	| { action: 'run'; jobId: string; runMode?: 'force' | 'due' }
	| { action: 'runs'; jobId: string; limit?: number }
	| { action: 'wake'; text: string; mode: 'now' | 'next-heartbeat' };

export interface FridayCronStatus {
	enabled: boolean;
	timerArmed: boolean;
	jobCount: number;
	runningCount: number;
	nextRunAtMs?: number;
	warning?: string;
}

export interface FridayCronToolResponse {
	status: 'ok' | 'error';
	enabled?: boolean;
	warning?: string;
	result?:
		| FridayCronStatus
		| FridayCronJob
		| FridayCronJob[]
		| FridayCronRunRecord
		| FridayCronRunRecord[]
		| { enabled: boolean }
		| { removed: true; jobId: string }
		| { woken: true; status: FridayCronStatus };
	error?: string;
}

export type CronJobSchedule = FridayCronSchedule;
export type CronJobSessionTarget = FridayCronSessionTarget;
export type CronJobWakeMode = FridayCronWakeMode;
export type CronJobPayload = FridayCronPayload;
export type CronJobDeliveryTarget = FridayCronDeliveryTarget;
export type CronJobDelivery = FridayCronDelivery;
export type CronJobFailureAlert = FridayCronFailureAlert;
export type CronJobDeliveryState = FridayCronDeliveryState;
export type CronJobRunError = FridayCronRunError;
export type CronJobRunStatus = FridayCronRunStatus;
export type CronJobState = FridayCronJobState;
export type CronJobDefinition = FridayCronJobDefinition;
export type CronJob = FridayCronJob;
export type CronJobRunRecord = FridayCronRunRecord;
export type CronJobAddRequest = FridayCronAddRequest;
export type CronJobUpdateRequest = FridayCronUpdateRequest;
export type CronJobToolAction = FridayCronToolAction;
export type CronJobToolRequest = FridayCronToolRequest;
export type CronJobCanonicalToolRequest = FridayCronCanonicalToolRequest;
export type CronJobStatus = FridayCronStatus;
export type CronJobToolResponse = FridayCronToolResponse;
