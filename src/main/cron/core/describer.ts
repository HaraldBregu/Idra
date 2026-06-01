import type { CronSchedule } from './cron.types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateTime(iso: string, timezone: string): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(iso));
}

function cronDescription(expression: string, timezone: string): string {
	const fields = expression.trim().split(/\s+/);
	if (fields.length !== 5) return `Cron ${expression} ${timezone}`;
	const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
	const time = `${hour!.padStart(2, '0')}:${minute!.padStart(2, '0')}`;

	if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
		return `Every day at ${time} ${timezone}`;
	}
	if (dayOfMonth === '*' && month === '*' && dayOfWeek && /^\d$/.test(dayOfWeek)) {
		const day = Number(dayOfWeek) === 7 ? 0 : Number(dayOfWeek);
		return `Every ${DAY_NAMES[day] ?? `day ${dayOfWeek}`} at ${time} ${timezone}`;
	}
	if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
		return `Every weekday at ${time} ${timezone}`;
	}
	return `Cron ${expression} ${timezone}`;
}

function duration(ms: number): string {
	const minutes = Math.round(ms / 60_000);
	if (minutes < 60) return `Every ${minutes} minute${minutes === 1 ? '' : 's'}`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `Every ${hours} hour${hours === 1 ? '' : 's'}`;
	const days = Math.round(hours / 24);
	return `Every ${days} day${days === 1 ? '' : 's'}`;
}

export class ScheduleDescriber {
	describeSchedule(schedule: CronSchedule): string {
		const suffix = schedule.endAt ? ` until ${formatDateTime(schedule.endAt, schedule.timezone)}` : '';
		if (schedule.type === 'cron' && schedule.cronExpression) {
			return `${cronDescription(schedule.cronExpression, schedule.timezone)}${suffix}`;
		}
		if (['interval', 'fixedRate', 'fixedDelay'].includes(schedule.type) && schedule.intervalMs) {
			return `${duration(schedule.intervalMs)}${suffix}`;
		}
		if (schedule.type === 'oneTime' && schedule.runAt) {
			return `Once on ${formatDateTime(schedule.runAt, schedule.timezone)} ${schedule.timezone}`;
		}
		if (schedule.type === 'manual') return 'Manual schedule';
		return `${schedule.type} schedule`;
	}

	describeNextRun(schedule: CronSchedule): string {
		if (!schedule.nextRunAt) return 'No future run is scheduled.';
		return `Next run: ${formatDateTime(schedule.nextRunAt, schedule.timezone)} ${schedule.timezone}`;
	}

	describeMissedRunPolicy(schedule: CronSchedule): string {
		switch (schedule.missedRunPolicy) {
			case 'skip':
				return 'Missed runs are skipped.';
			case 'runOnce':
				return 'If missed, one run is triggered when the app starts.';
			case 'catchUp':
				return `Missed runs are caught up, limited to ${schedule.maxCatchUpRuns ?? 1}.`;
			case 'fail':
				return 'If missed, the schedule is marked failed.';
			case 'askUser':
				return 'If missed, the user is asked what to do.';
		}
	}

	describeConcurrencyPolicy(schedule: CronSchedule): string {
		switch (schedule.concurrencyPolicy) {
			case 'allowOverlap':
				return 'Overlapping runs are allowed.';
			case 'skipIfRunning':
				return 'A due run is skipped if a previous run is still active.';
			case 'queueIfRunning':
				return 'A due run is queued if a previous run is still active.';
			case 'cancelPrevious':
				return 'A due run cancels previous active runs before starting.';
			case 'replacePrevious':
				return 'A due run replaces previous active runs.';
		}
	}
}
