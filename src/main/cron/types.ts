import type { ScheduledTask } from 'node-cron';
import type {
	CronConcurrencyPolicy,
	CronConfirmationPolicy,
	CronExpression,
	CronJobInfo,
	CronJsonObject,
	CronJsonValue,
	CronMissedRunPolicy,
	CronRetryPolicy,
	CronScheduleId,
	CronSchedulePermissionLevel,
	CronScheduleStatus,
	CronScheduleVisibility,
	CronStoredSchedule,
	CronStoredTarget,
	CronTask,
	CronTaskPriority,
	CronTimezone,
} from '../../shared/app/cron';

export interface CronJobOptions {
	timezone?: string;
	runOnStart?: boolean;
	enabled?: boolean;
	name?: string;
	description?: string;
	providerId?: string;
	modelId?: string;
	target?: string;
}

export interface RegisteredJob {
	id: string;
	expression: string;
	timezone?: string;
	task?: ScheduledTask;
	info: CronJobInfo;
}

export type CronTaskHandler = (task: CronTask) => void | Promise<void>;

export type CronDstPolicy =
	| 'skipNonexistentTime'
	| 'shiftForward'
	| 'runAtNextValidTime'
	| 'runOnceForRepeatedHour';

export interface CronRunPolicy {
	maxCatchUpRuns: number;
	catchUpWindowMs: number;
	minIntervalMs: number;
	maxRunsPerTurn: number;
	highFrequencyThresholdMs: number;
	dstPolicy: CronDstPolicy;
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
