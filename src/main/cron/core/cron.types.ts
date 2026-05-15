import type {
	CronExecutionRecord,
	CronJsonObject,
	CronNextRunPreview,
	CronRetryPolicy,
	CronRunPolicy,
	CronSchedule,
	CronScheduleAuditEntry,
	CronScheduleConfirmation,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleId,
	CronSchedulePermissionLevel,
	CronScheduleSource,
	CronScheduleUpdateRequest,
} from '../../../shared/cron';
import type { Task, TaskCreateRequest, TaskListFilter } from '../../task-manager/core/task.types';

export type {
	CronConcurrencyPolicy,
	CronDstPolicy,
	CronExecutionRecord,
	CronExecutionStatus,
	CronExpression,
	CronJsonObject,
	CronJsonValue,
	CronMissedRunPolicy,
	CronNextRunPreview,
	CronRetryPolicy,
	CronRunPolicy,
	CronSchedule,
	CronScheduleAuditEntry,
	CronScheduleConfirmation,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleEventType,
	CronScheduleFilter,
	CronScheduleId,
	CronSchedulePermissionLevel,
	CronScheduleSource,
	CronScheduleStatus,
	CronScheduleType,
	CronScheduleUpdateRequest,
	CronScheduleVisibility,
	CronTaskPriority,
	CronTimezone,
	CronValidationResult,
} from '../../../shared/cron';

export interface CronActorContext {
	userId?: string;
	sessionId?: string;
	source: CronScheduleSource;
	sourceId?: string;
	permissions: CronSchedulePermissionLevel[];
	timezone: string;
	confirmed?: boolean;
	metadata?: CronJsonObject;
}

export interface CronScheduleStore {
	createSchedule(schedule: CronSchedule): Promise<CronSchedule>;
	updateSchedule(scheduleId: CronScheduleId, patch: Partial<CronSchedule>): Promise<CronSchedule>;
	getSchedule(scheduleId: CronScheduleId): Promise<CronSchedule>;
	listSchedules(filter?: CronScheduleFilter): Promise<CronSchedule[]>;
	deleteSchedule(scheduleId: CronScheduleId): Promise<void>;
	appendScheduleEvent(event: CronScheduleEvent): Promise<void>;
	getScheduleEvents(scheduleId: CronScheduleId): Promise<CronScheduleEvent[]>;
	recordExecution(record: CronExecutionRecord): Promise<void>;
	listExecutions(scheduleId: CronScheduleId): Promise<CronExecutionRecord[]>;
	getExecutionByIdempotencyKey(idempotencyKey: string): Promise<CronExecutionRecord | undefined>;
	acquireScheduleLock(scheduleId: CronScheduleId, runnerId: string, ttlMs: number): Promise<boolean>;
	releaseScheduleLock(scheduleId: CronScheduleId, runnerId: string): Promise<void>;
	listActiveSchedules(): Promise<CronSchedule[]>;
	listRecoverableSchedules(): Promise<CronSchedule[]>;
	listDueSchedules(now: Date): Promise<CronSchedule[]>;
}

export interface CronScheduleRunner {
	createTaskForSchedule(input: {
		schedule: CronSchedule;
		scheduledRunAt: string;
		actualTriggeredAt: string;
		runNumber: number;
		missedRun: boolean;
		idempotencyKey: string;
		runnerId: string;
	}): Promise<Task>;
	findExistingTask?(filter: {
		scheduleId: CronScheduleId;
		scheduledRunAt: string;
	}): Promise<Task | undefined>;
	listRunningTasks?(scheduleId: CronScheduleId): Promise<Task[]>;
	cancelRunningTasks?(scheduleId: CronScheduleId, reason: string): Promise<void>;
}

export interface CronTaskManagerPort {
	createTask(request: TaskCreateRequest): Promise<Task>;
	listTasks(filter?: TaskListFilter): Promise<Task[]>;
	cancelTask?(taskId: string, reason?: string): Promise<void>;
	enqueueTask?(taskId: string): Promise<void>;
}

export interface CronScheduleAccessPolicy {
	authorize(input: {
		action: CronSchedulePermissionLevel;
		schedule?: CronSchedule;
		request?: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
	}): Promise<void>;
	requiresConfirmation(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): boolean;
	validateFrequency(input: {
		request: CronScheduleCreateRequest | CronScheduleUpdateRequest;
		actor: CronActorContext;
		existingSchedule?: CronSchedule;
	}): void;
}

export interface CronScheduler {
	start(): Promise<void>;
	stop(): Promise<void>;
	reload(): Promise<void>;
	createSchedule(request: CronScheduleCreateRequest, actor?: CronActorContext): Promise<CronSchedule>;
	updateSchedule(
		scheduleId: CronScheduleId,
		patch: CronScheduleUpdateRequest,
		actor?: CronActorContext
	): Promise<CronSchedule>;
	pauseSchedule(scheduleId: CronScheduleId, actor?: CronActorContext): Promise<void>;
	resumeSchedule(scheduleId: CronScheduleId, actor?: CronActorContext): Promise<void>;
	deleteSchedule(scheduleId: CronScheduleId, actor?: CronActorContext): Promise<void>;
	getSchedule(scheduleId: CronScheduleId, actor?: CronActorContext): Promise<CronSchedule>;
	listSchedules(filter?: CronScheduleFilter, actor?: CronActorContext): Promise<CronSchedule[]>;
	runScheduleNow(scheduleId: CronScheduleId, actor?: CronActorContext): Promise<Task>;
	computeNextRun(schedule: CronSchedule, from?: Date): Promise<Date | null>;
	recoverSchedulesOnStartup(): Promise<void>;
	processDueSchedules(now: Date): Promise<void>;
	getNextRuns(scheduleId: CronScheduleId, count: number, actor?: CronActorContext): Promise<CronNextRunPreview>;
}

export interface CronSchedulerOptions {
	runnerId: string;
	pollIntervalMs: number;
	lockTtlMs: number;
	maxToolCallsPerTurn: number;
	maxPlanningDepth: number;
	totalTurnTimeoutMs: number;
	runPolicy: CronRunPolicy;
	defaultRetryPolicy: CronRetryPolicy;
	defaultTimezone: string;
}

export interface CronStoreState {
	schemaVersion: number;
	schedules: CronSchedule[];
	events: CronScheduleEvent[];
	executions: CronExecutionRecord[];
	locks: Record<string, { runnerId: string; expiresAt: string }>;
	confirmations: CronScheduleConfirmation[];
	quarantined: CronJsonObject[];
}

export interface CronAuditLog {
	append(entry: CronScheduleAuditEntry): Promise<void>;
	list(scheduleId: CronScheduleId): Promise<CronScheduleAuditEntry[]>;
}
