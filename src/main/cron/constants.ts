import { randomUUID } from 'node:crypto';
import type {
	CronConcurrencyPolicy,
	CronMissedRunPolicy,
	CronRetryPolicy,
	CronRunPolicy,
	CronSchedulerOptions,
	CronScheduleSource,
	CronScheduleStatus,
	CronScheduleType,
	CronScheduleVisibility,
} from './core/types';

export const CRON_AGENT_TASK_TYPE = 'agent.run';
export const DEFAULT_CRON_AGENT_ID = 'main';
export const CRON_STORE_SCHEMA_VERSION = 1;
export const CRON_JOB_STORE_SCHEMA_VERSION = 1;

export const CRON_MINUTE_MS = 60_000;
export const MAX_CRON_SCAN_MINUTES = 366 * 24 * 60;
export const MAX_AGENT_INSTRUCTION_LENGTH = 200_000;

export const CRON_DAY_NAMES = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];

export const CRON_FIELD_RANGES: readonly [min: number, max: number][] = [
	[0, 59],
	[0, 23],
	[1, 31],
	[1, 12],
	[0, 7],
];

export const CRON_SCHEDULE_TYPES: readonly CronScheduleType[] = [
	'cron',
	'interval',
	'fixedRate',
	'fixedDelay',
	'oneTime',
	'calendar',
	'manual',
];

export const CRON_SOURCES: readonly CronScheduleSource[] = [
	'agent',
	'skill',
	'tool',
	'connector',
	'api',
	'ui',
	'system',
	'migration',
	'maintenance',
];

export const CRON_STATUSES: readonly CronScheduleStatus[] = [
	'active',
	'paused',
	'disabled',
	'expired',
	'completed',
	'failed',
	'deleted',
];

export const CRON_VISIBILITIES: readonly CronScheduleVisibility[] = [
	'private',
	'user',
	'workspace',
	'system',
];

export const CRON_MISSED_POLICIES: readonly CronMissedRunPolicy[] = [
	'skip',
	'runOnce',
	'catchUp',
	'fail',
	'askUser',
];

export const CRON_CONCURRENCY_POLICIES: readonly CronConcurrencyPolicy[] = [
	'allowOverlap',
	'skipIfRunning',
	'queueIfRunning',
	'cancelPrevious',
	'replacePrevious',
];

export const CRON_REDACT_SENSITIVE_KEY_PATTERN =
	/(api[-_]?key|token|secret|password|credential|authorization|cookie|oauth|private[-_]?key|payment|card|body|content)/i;
export const CRON_SECRET_KEY_PATTERN =
	/(api[-_]?key|token|secret|password|credential|authorization|oauth|private[-_]?key)/i;
export const CRON_RUNTIME_CONFIG_KEY_PATTERN =
	/^(provider|providerId|providerConfig|model|modelId|modelConfig|baseUrl|baseURL|apiBaseUrl|endpointUrl)$/;
export const CRON_SECRET_VALUE_PATTERNS: readonly RegExp[] = [
	/-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
	/authorization\s*:\s*bearer\s+\S+/i,
	/(?:api[-_]?key|credential|password|secret|token)\s*[:=]\s*\S+/i,
];

export const CRON_AGENT_TASK_INPUT_KEYS = new Set(['message']);
export const CRON_PATH_SEPARATOR_PATTERN = /[\\/]/;

export const CRON_JOB_CONTROL_FIELDS = new Set([
	'action',
	'id',
	'jobId',
	'job',
	'patch',
	'contextMessages',
	'timeoutMs',
	'includeDisabled',
	'include',
	'agentId',
	'runMode',
	'mode',
	'force',
	'limit',
]);

export const CRON_JOB_AGENT_TURN_FIELDS = [
	'fallbacks',
	'thinking',
	'timeoutSeconds',
	'lightContext',
	'allowUnsafeExternalContent',
	'toolsAllow',
] as const;

export const DEFAULT_CRON_RETRY_POLICY: CronRetryPolicy = {
	maxAttempts: 1,
	initialDelayMs: 500,
	maxDelayMs: 15_000,
	backoffMultiplier: 2,
	jitter: true,
	retryableErrorCodes: ['CRON_SCHEDULE_EXECUTION_TRANSIENT', 'CRON_SCHEDULE_LOCK_FAILED'],
	nonRetryableErrorCodes: ['CRON_SCHEDULE_VALIDATION_FAILED', 'CRON_PERMISSION_DENIED'],
};

export const DEFAULT_CRON_RUN_POLICY: CronRunPolicy = {
	maxCatchUpRuns: 5,
	catchUpWindowMs: 24 * 60 * 60_000,
	minIntervalMs: 60_000,
	maxRunsPerTurn: 20,
	highFrequencyThresholdMs: 5 * 60_000,
	dstPolicy: 'skipNonexistentTime',
};

export const DEFAULT_CRON_SCHEDULER_OPTIONS: CronSchedulerOptions = {
	runnerId: `cron-${process.pid}-${randomUUID()}`,
	pollIntervalMs: 30_000,
	lockTtlMs: 2 * 60_000,
	maxToolCallsPerTurn: 20,
	maxPlanningDepth: 10,
	totalTurnTimeoutMs: 5 * 60_000,
	runPolicy: DEFAULT_CRON_RUN_POLICY,
	defaultRetryPolicy: DEFAULT_CRON_RETRY_POLICY,
	defaultTimezone: 'UTC',
};

export const DEFAULT_CRON_JOB_OPTIONS = {
	enabled: process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false',
	maintenanceIntervalMs: 60_000,
	minRefireGapMs: 1_000,
	stuckRunThresholdMs: 30 * 60_000,
	maxConcurrentRuns: 1,
	scheduleErrorDisableThreshold: 3,
	defaultOneShotMaxAttempts: 3,
	defaultBackoffMs: 60_000,
	defaultMaxBackoffMs: 15 * 60_000,
	defaultTimezone: 'UTC',
};
