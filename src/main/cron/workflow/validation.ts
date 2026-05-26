import type {
	FridayCronDelivery,
	FridayCronJobDefinition,
	FridayCronPayload,
	FridayCronSchedule,
	FridayCronSessionTarget,
} from '../../../shared/cron';
import {
	CronExpressionError,
	CronScheduleValidationError,
} from '../core/cron.errors';
import { isValidTimezone, validateCronExpression } from '../core/cron.validation';

const PATH_SEPARATOR_PATTERN = /[\\/]/;

export function assertSafeCronId(id: string, field = 'id'): void {
	if (!id.trim()) {
		throw new CronScheduleValidationError(`${field} must not be empty.`, { field });
	}
	if (id.includes('\0') || PATH_SEPARATOR_PATTERN.test(id)) {
		throw new CronScheduleValidationError(`${field} must not contain path separators or null bytes.`, {
			field,
		});
	}
}

export function assertValidSessionTarget(target: FridayCronSessionTarget): void {
	if (target === 'main' || target === 'isolated' || target === 'current') return;
	if (!target.startsWith('session:')) {
		throw new CronScheduleValidationError('sessionTarget is not supported.', { sessionTarget: target });
	}
	assertSafeCronId(target.slice('session:'.length), 'session id');
}

export function assertValidPayload(payload: FridayCronPayload): void {
	if (payload.kind === 'systemEvent') {
		if (!payload.text.trim()) {
			throw new CronScheduleValidationError('systemEvent payload text is required.');
		}
		return;
	}

	if (payload.kind === 'agentTurn') {
		if (!payload.message.trim()) {
			throw new CronScheduleValidationError('agentTurn payload message is required.');
		}
		if (payload.timeoutSeconds !== undefined && (!Number.isFinite(payload.timeoutSeconds) || payload.timeoutSeconds <= 0)) {
			throw new CronScheduleValidationError('timeoutSeconds must be a positive number.');
		}
		return;
	}

	throw new CronScheduleValidationError('payload kind is not supported.');
}

export function assertTargetMatchesPayload(target: FridayCronSessionTarget, payload: FridayCronPayload): void {
	if (target === 'main' && payload.kind !== 'systemEvent') {
		throw new CronScheduleValidationError('main session cron jobs require payload.kind = systemEvent.');
	}
	if (target !== 'main' && payload.kind !== 'agentTurn') {
		throw new CronScheduleValidationError(
			'isolated/current/session cron jobs require payload.kind = agentTurn.'
		);
	}
}

export function assertValidSchedule(schedule: FridayCronSchedule): void {
	switch (schedule.kind) {
		case 'at': {
			const timestamp = Date.parse(schedule.at);
			if (!Number.isFinite(timestamp)) {
				throw new CronScheduleValidationError('at schedule requires an ISO timestamp.', {
					at: schedule.at,
				});
			}
			return;
		}
		case 'every':
			if (!Number.isFinite(schedule.everyMs) || schedule.everyMs <= 0) {
				throw new CronScheduleValidationError('every schedule requires a positive everyMs.', {
					everyMs: schedule.everyMs,
				});
			}
			if (schedule.anchorMs !== undefined && !Number.isFinite(schedule.anchorMs)) {
				throw new CronScheduleValidationError('anchorMs must be a finite number.', {
					anchorMs: schedule.anchorMs,
				});
			}
			return;
		case 'cron': {
			const validation = validateCronExpression(schedule.expr);
			if (!validation.valid) {
				throw new CronExpressionError(validation.message ?? 'Invalid cron expression.');
			}
			if (schedule.tz && !isValidTimezone(schedule.tz)) {
				throw new CronScheduleValidationError(`Invalid timezone: ${schedule.tz}`, {
					timezone: schedule.tz,
				});
			}
			for (const field of ['staggerMs'] as const) {
				const value = schedule[field];
				if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
					throw new CronScheduleValidationError(`${field} must be a non-negative number.`, {
						field,
					});
				}
			}
			return;
		}
	}
}

export function normalizeDelivery(
	payload: FridayCronPayload,
	target: FridayCronSessionTarget,
	delivery?: Partial<FridayCronDelivery>
): FridayCronDelivery {
	const defaultMode = payload.kind === 'agentTurn' && target !== 'main' ? 'announce' : 'none';
	const mode = delivery?.mode ?? defaultMode;
	if (!['announce', 'webhook', 'none'].includes(mode)) {
		throw new CronScheduleValidationError('delivery.mode is not supported.');
	}
	if (mode === 'webhook') {
		const url = delivery?.to;
		if (!url) throw new CronScheduleValidationError('delivery.to is required for webhook delivery.');
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
				throw new Error('unsupported protocol');
			}
		} catch {
			throw new CronScheduleValidationError('delivery.to must be an HTTP(S) URL for webhook delivery.');
		}
	}
	return {
		mode,
		channel: delivery?.channel,
		to: delivery?.to,
		threadId: delivery?.threadId,
		accountId: delivery?.accountId,
		bestEffort: delivery?.bestEffort ?? true,
		failureDestination: delivery?.failureDestination,
	};
}

export function assertValidFridayJob(job: FridayCronJobDefinition): void {
	assertSafeCronId(job.id);
	if (!job.name.trim()) throw new CronScheduleValidationError('Cron job name is required.');
	assertValidSchedule(job.schedule);
	assertValidSessionTarget(job.sessionTarget);
	assertValidPayload(job.payload);
	assertTargetMatchesPayload(job.sessionTarget, job.payload);
	if (job.maxAttempts !== undefined && (!Number.isInteger(job.maxAttempts) || job.maxAttempts < 1)) {
		throw new CronScheduleValidationError('maxAttempts must be a positive integer.');
	}
	if (job.backoffMs !== undefined && (!Number.isFinite(job.backoffMs) || job.backoffMs < 0)) {
		throw new CronScheduleValidationError('backoffMs must be a non-negative number.');
	}
	if (job.maxBackoffMs !== undefined && (!Number.isFinite(job.maxBackoffMs) || job.maxBackoffMs < 0)) {
		throw new CronScheduleValidationError('maxBackoffMs must be a non-negative number.');
	}
}

export function fridayScheduleIdentity(schedule: FridayCronSchedule): string {
	return JSON.stringify(schedule, Object.keys(schedule).sort());
}
