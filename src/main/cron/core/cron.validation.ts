import type {
	CronConcurrencyPolicy,
	CronMissedRunPolicy,
	CronRunPolicy,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleSource,
	CronScheduleStatus,
	CronScheduleType,
	CronScheduleUpdateRequest,
	CronScheduleVisibility,
	CronValidationResult,
} from './cron.types';
import {
	CronExpressionError,
	CronScheduleValidationError,
} from './cron.errors';

const CRON_FIELD_RANGES: readonly [min: number, max: number][] = [
	[0, 59],
	[0, 23],
	[1, 31],
	[1, 12],
	[0, 7],
];

const SCHEDULE_TYPES: readonly CronScheduleType[] = [
	'cron',
	'interval',
	'fixedRate',
	'fixedDelay',
	'oneTime',
	'calendar',
	'manual',
];

const SOURCES: readonly CronScheduleSource[] = [
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

const STATUSES: readonly CronScheduleStatus[] = [
	'active',
	'paused',
	'disabled',
	'expired',
	'completed',
	'failed',
	'deleted',
];

const VISIBILITIES: readonly CronScheduleVisibility[] = ['private', 'user', 'workspace', 'system'];
const MISSED_POLICIES: readonly CronMissedRunPolicy[] = ['skip', 'runOnce', 'catchUp', 'fail', 'askUser'];
const CONCURRENCY_POLICIES: readonly CronConcurrencyPolicy[] = [
	'allowOverlap',
	'skipIfRunning',
	'queueIfRunning',
	'cancelPrevious',
	'replacePrevious',
];

function parseCronPart(part: string, min: number, max: number): number[] | null {
	const values = new Set<number>();
	for (const rawSegment of part.split(',')) {
		const segment = rawSegment.trim();
		if (!segment) return null;
		const [base, stepText] = segment.split('/');
		const step = stepText === undefined ? 1 : Number(stepText);
		if (!Number.isInteger(step) || step < 1) return null;

		let from: number;
		let to: number;
		if (base === '*') {
			from = min;
			to = max;
		} else if (base.includes('-')) {
			const [startText, endText] = base.split('-');
			from = Number(startText);
			to = Number(endText);
		} else {
			from = Number(base);
			to = from;
		}

		if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
		if (from < min || to > max || from > to) return null;
		for (let value = from; value <= to; value += step) {
			values.add(value);
		}
	}

	if (values.size === 0) return null;
	return [...values].sort((a, b) => a - b);
}

export function parseCronExpression(expression: string): [number[], number[], number[], number[], number[]] {
	const fields = expression.trim().split(/\s+/);
	if (fields.length !== 5) {
		throw new CronExpressionError('Cron expression must use 5 fields: minute hour dayOfMonth month dayOfWeek.');
	}

	const parsed = fields.map((field, index) => {
		const [min, max] = CRON_FIELD_RANGES[index]!;
		const values = parseCronPart(field, min, max);
		if (!values) {
			throw new CronExpressionError(`Invalid cron field ${index + 1}: "${field}".`, {
				field,
				expression,
			});
		}
		return values;
	}) as [number[], number[], number[], number[], number[]];

	return parsed;
}

export function validateCronExpression(expression: string): CronValidationResult {
	try {
		parseCronExpression(expression);
		return { valid: true, normalizedExpression: expression.trim().replace(/\s+/g, ' ') };
	} catch (error) {
		return {
			valid: false,
			message: error instanceof Error ? error.message : 'Invalid cron expression.',
		};
	}
}

export function isValidTimezone(timezone: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
		return true;
	} catch {
		return false;
	}
}

function assertIsoDate(value: string | undefined, field: string): void {
	if (value === undefined) return;
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) {
		throw new CronScheduleValidationError(`${field} must be an ISO date string.`, { field });
	}
}

function assertInList<T extends string>(value: T, allowed: readonly T[], field: string): void {
	if (!allowed.includes(value)) {
		throw new CronScheduleValidationError(`${field} is not supported.`, { field, value });
	}
}

export function validateScheduleShape(
	request: CronScheduleCreateRequest | CronScheduleUpdateRequest,
	runPolicy: CronRunPolicy,
	existing?: CronSchedule
): void {
	const nextType = 'type' in request && request.type ? request.type : existing?.type;
	if (!nextType) throw new CronScheduleValidationError('Schedule type is required.');
	assertInList(nextType, SCHEDULE_TYPES, 'type');

	if ('source' in request && request.source) assertInList(request.source, SOURCES, 'source');
	if (request.status) assertInList(request.status, STATUSES, 'status');
	if (request.visibility) assertInList(request.visibility, VISIBILITIES, 'visibility');
	if (request.missedRunPolicy) assertInList(request.missedRunPolicy, MISSED_POLICIES, 'missedRunPolicy');
	if (request.concurrencyPolicy) assertInList(request.concurrencyPolicy, CONCURRENCY_POLICIES, 'concurrencyPolicy');

	const timezone = request.timezone ?? existing?.timezone;
	if (!timezone) throw new CronScheduleValidationError('Timezone is required.');
	if (!isValidTimezone(timezone)) {
		throw new CronScheduleValidationError(`Invalid timezone: ${timezone}`, { timezone });
	}

	const cronExpression = request.cronExpression ?? existing?.cronExpression;
	if (nextType === 'cron') {
		if (!cronExpression) throw new CronScheduleValidationError('cronExpression is required for cron schedules.');
		const validation = validateCronExpression(cronExpression);
		if (!validation.valid) throw new CronExpressionError(validation.message ?? 'Invalid cron expression.');
	}

	const intervalMs = request.intervalMs ?? existing?.intervalMs;
	if (['interval', 'fixedRate', 'fixedDelay'].includes(nextType)) {
		if (!Number.isFinite(intervalMs) || typeof intervalMs !== 'number') {
			throw new CronScheduleValidationError('intervalMs is required for interval schedules.');
		}
		if (intervalMs < runPolicy.minIntervalMs) {
			throw new CronScheduleValidationError(
				`intervalMs must be at least ${runPolicy.minIntervalMs}ms.`,
				{ intervalMs, minIntervalMs: runPolicy.minIntervalMs }
			);
		}
	}

	const runAt = request.runAt ?? existing?.runAt;
	if (nextType === 'oneTime') {
		if (!runAt) throw new CronScheduleValidationError('runAt is required for one-time schedules.');
		assertIsoDate(runAt, 'runAt');
	}

	assertIsoDate(request.startAt ?? existing?.startAt, 'startAt');
	assertIsoDate(request.endAt ?? existing?.endAt, 'endAt');
	assertIsoDate(request.runAt ?? existing?.runAt, 'runAt');

	const startAt = Date.parse(request.startAt ?? existing?.startAt ?? '1970-01-01T00:00:00.000Z');
	const endAtValue = request.endAt ?? existing?.endAt;
	if (endAtValue && Date.parse(endAtValue) <= startAt) {
		throw new CronScheduleValidationError('endAt must be after startAt.');
	}

	const maxRuns = request.maxRuns ?? existing?.maxRuns;
	if (maxRuns !== undefined && (!Number.isInteger(maxRuns) || maxRuns < 1)) {
		throw new CronScheduleValidationError('maxRuns must be a positive integer.');
	}

	const maxCatchUpRuns = request.maxCatchUpRuns ?? existing?.maxCatchUpRuns;
	if (maxCatchUpRuns !== undefined && (!Number.isInteger(maxCatchUpRuns) || maxCatchUpRuns < 0)) {
		throw new CronScheduleValidationError('maxCatchUpRuns must be zero or a positive integer.');
	}

	const taskType = request.taskType ?? existing?.taskType;
	if (!taskType || !taskType.trim()) throw new CronScheduleValidationError('taskType is required.');
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.status === 'active' && schedule.enabled && !schedule.deletedAt;
}

export function assertScheduleCanRun(schedule: CronSchedule): void {
	if (!isActiveSchedule(schedule)) {
		throw new CronScheduleValidationError(`Schedule is not active: ${schedule.id}`, {
			scheduleId: schedule.id,
			status: schedule.status,
		});
	}
	if (schedule.endAt && Date.parse(schedule.endAt) <= Date.now()) {
		throw new CronScheduleValidationError(`Schedule has expired: ${schedule.id}`, {
			scheduleId: schedule.id,
		});
	}
	if (schedule.maxRuns !== undefined && schedule.runCount >= schedule.maxRuns) {
		throw new CronScheduleValidationError(`Schedule has reached maxRuns: ${schedule.id}`, {
			scheduleId: schedule.id,
		});
	}
}
