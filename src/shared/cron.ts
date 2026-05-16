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
	readonly model?: string;
}

export interface CronTaskAppData extends CronTaskData<'app'> {
	readonly action: string;
	readonly payload?: Record<string, unknown>;
}

export interface CronTaskMessageData extends CronTaskData<'message'> {
	readonly message: string;
}

export interface CronTask<TData extends CronTaskData = CronTaskData> {
	readonly id: string;
	readonly expression: string;
	readonly data: TData;
	readonly timezone?: string;
	readonly createdAt: string;
	readonly lastRun?: string;
}

export interface CronTaskView<TData extends CronTaskData = CronTaskData>
	extends CronTask<TData> {
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
	| 'schedule.confirmationRequired'
	| 'schedule.permissionDenied'
	| 'schedule.nextRunUpdated';

export type CronDstPolicy =
	| 'skipNonexistentTime'
	| 'shiftForward'
	| 'runAtNextValidTime'
	| 'runOnceForRepeatedHour';

export type CronTaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type CronJsonValue =
	| string
	| number
	| boolean
	| null
	| CronJsonValue[]
	| { [key: string]: CronJsonValue };

export type CronJsonObject = Record<string, CronJsonValue>;

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
	lastSuccessfulRunAt?: string;
	lastFailedRunAt?: string;
	lastEvaluatedAt?: string;
	missedRunPolicy: CronMissedRunPolicy;
	maxCatchUpRuns?: number;
	catchUpWindowMs?: number;
	concurrencyPolicy: CronConcurrencyPolicy;
	retryPolicy: CronRetryPolicy;
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

export type OpenClawCronSchedule =
	| { kind: 'at'; at: string }
	| { kind: 'every'; intervalMs: number }
	| {
			kind: 'cron';
			expression: string;
			timezone?: string;
			staggerMs?: number;
			jitterMs?: number;
	  };

export type OpenClawCronSessionTarget =
	| 'main'
	| 'isolated'
	| 'current'
	| `session:${string}`;

export type OpenClawCronWakeMode = 'now' | 'defer';

export type OpenClawCronPayload =
	| { kind: 'systemEvent'; text: string }
	| {
			kind: 'agentTurn';
			prompt: string;
			model?: string;
			fallbacks?: string[];
			thinking?: 'low' | 'medium' | 'high';
			timeoutSeconds?: number;
			lightContext?: boolean;
			toolsAllow?: string[];
			allowUnsafeExternalContent?: boolean;
	  };

export interface OpenClawCronDeliveryTarget {
	channel?: 'last' | string;
	to?: string;
	threadId?: string;
	accountId?: string;
}

export interface OpenClawCronDelivery extends OpenClawCronDeliveryTarget {
	mode: 'announce' | 'webhook' | 'none';
	url?: string;
	bestEffort?: boolean;
	failureDestination?: OpenClawCronDeliveryTarget & {
		mode?: 'announce' | 'webhook' | 'none';
		url?: string;
	};
}

export interface OpenClawCronFailureAlert {
	threshold?: number;
	cooldownMs?: number;
	mode?: 'announce' | 'webhook' | 'none';
	target?: OpenClawCronDeliveryTarget & { url?: string };
	includeSkipped?: boolean;
}

export interface OpenClawCronDeliveryState {
	mode: OpenClawCronDelivery['mode'];
	status: 'sent' | 'skipped' | 'failed';
	attemptedAtMs: number;
	target?: OpenClawCronDeliveryTarget;
	error?: string;
	duplicateSuppressed?: boolean;
}

export interface OpenClawCronRunError {
	code: string;
	message: string;
	permanent?: boolean;
}

export type OpenClawCronRunStatus = 'ok' | 'error' | 'skipped';

export interface OpenClawCronJobState {
	nextRunAtMs?: number;
	runningAtMs?: number;
	lastRunAtMs?: number;
	lastRunStatus?: OpenClawCronRunStatus;
	lastError?: OpenClawCronRunError;
	diagnostics?: CronJsonObject;
	delivery?: OpenClawCronDeliveryState;
	consecutiveErrors: number;
	consecutiveSkipped: number;
	consecutiveScheduleErrors: number;
	attempts: number;
	scheduleIdentity?: string;
	lastFailureAlertAtMs?: number;
}

export interface OpenClawCronJobDefinition {
	id: string;
	name: string;
	description: string;
	enabled: boolean;
	createdAtMs: number;
	updatedAtMs: number;
	schedule: OpenClawCronSchedule;
	sessionTarget: OpenClawCronSessionTarget;
	wakeMode: OpenClawCronWakeMode;
	payload: OpenClawCronPayload;
	delivery: OpenClawCronDelivery;
	failureAlert?: OpenClawCronFailureAlert;
	agentId?: string;
	sessionKey?: string;
	deleteAfterRun?: boolean;
	maxAttempts?: number;
	backoffMs?: number;
	maxBackoffMs?: number;
}

export interface OpenClawCronJob extends OpenClawCronJobDefinition {
	state: OpenClawCronJobState;
}

export interface OpenClawCronRunRecord {
	runId: string;
	jobId: string;
	status: OpenClawCronRunStatus;
	mode: 'automatic' | 'manual-force' | 'manual-due' | 'startup-recovery';
	scheduledForMs: number;
	startedAtMs: number;
	finishedAtMs: number;
	attempt: number;
	output?: string;
	skippedReason?: string;
	error?: OpenClawCronRunError;
	delivery?: OpenClawCronDeliveryState;
	alreadyDelivered?: boolean;
}

export interface OpenClawCronAddRequest {
	id?: string;
	name: string;
	description?: string;
	enabled?: boolean;
	schedule: OpenClawCronSchedule;
	sessionTarget?: OpenClawCronSessionTarget;
	wakeMode?: OpenClawCronWakeMode;
	payload: OpenClawCronPayload;
	delivery?: Partial<OpenClawCronDelivery>;
	failureAlert?: OpenClawCronFailureAlert;
	agentId?: string;
	sessionKey?: string;
	deleteAfterRun?: boolean;
	maxAttempts?: number;
	backoffMs?: number;
	maxBackoffMs?: number;
}

export type OpenClawCronUpdateRequest = Partial<
	Omit<OpenClawCronAddRequest, 'id' | 'name' | 'payload' | 'schedule' | 'delivery'>
> & {
	name?: string;
	payload?: OpenClawCronPayload;
	schedule?: OpenClawCronSchedule;
	delivery?: Partial<OpenClawCronDelivery>;
};

export type OpenClawCronToolRequest =
	| { action: 'status' }
	| { action: 'list'; include?: 'enabled' | 'disabled' | 'all' }
	| { action: 'get'; jobId: string }
	| { action: 'add'; job: OpenClawCronAddRequest }
	| { action: 'update'; jobId: string; patch: OpenClawCronUpdateRequest }
	| { action: 'remove'; jobId: string }
	| { action: 'run'; jobId: string; mode?: 'force' | 'due'; force?: boolean }
	| { action: 'runs'; jobId: string; limit?: number }
	| { action: 'wake' };

export interface OpenClawCronStatus {
	enabled: boolean;
	timerArmed: boolean;
	jobCount: number;
	runningCount: number;
	nextRunAtMs?: number;
	warning?: string;
}

export interface OpenClawCronToolResponse {
	status: 'ok' | 'error';
	enabled?: boolean;
	warning?: string;
	result?:
		| OpenClawCronStatus
		| OpenClawCronJob
		| OpenClawCronJob[]
		| OpenClawCronRunRecord
		| OpenClawCronRunRecord[]
		| { removed: true; jobId: string }
		| { woken: true; status: OpenClawCronStatus };
	error?: string;
}
