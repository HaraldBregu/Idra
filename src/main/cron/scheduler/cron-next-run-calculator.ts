import type { CronSchedule } from '../core/cron.types';
import { parseCronExpression } from '../core/cron.validation';

interface TimeParts {
	minute: number;
	hour: number;
	dayOfMonth: number;
	month: number;
	dayOfWeek: number;
}

const MINUTE_MS = 60_000;
const MAX_CRON_SCAN_MINUTES = 366 * 24 * 60;

function getTimeParts(date: Date, timezone: string): TimeParts {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		minute: '2-digit',
		hour: '2-digit',
		hourCycle: 'h23',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		weekday: 'short',
	}).formatToParts(date);

	const byType = new Map(parts.map((part) => [part.type, part.value]));
	const weekday = byType.get('weekday') ?? 'Sun';
	const dayOfWeekByName: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
	};

	return {
		minute: Number(byType.get('minute')),
		hour: Number(byType.get('hour')),
		dayOfMonth: Number(byType.get('day')),
		month: Number(byType.get('month')),
		dayOfWeek: dayOfWeekByName[weekday] ?? 0,
	};
}

function includesDayOfWeek(values: number[], dayOfWeek: number): boolean {
	return values.includes(dayOfWeek) || (dayOfWeek === 0 && values.includes(7));
}

function isWildcard(rawField: string): boolean {
	return rawField === '*' || rawField === '*/1';
}

function matchesCron(schedule: CronSchedule, date: Date): boolean {
	if (!schedule.cronExpression) return false;
	const [minutes, hours, daysOfMonth, months, daysOfWeek] = parseCronExpression(schedule.cronExpression);
	const parts = getTimeParts(date, schedule.timezone);
	const rawFields = schedule.cronExpression.trim().split(/\s+/);

	if (!minutes.includes(parts.minute)) return false;
	if (!hours.includes(parts.hour)) return false;
	if (!months.includes(parts.month)) return false;

	const dayOfMonthMatches = daysOfMonth.includes(parts.dayOfMonth);
	const dayOfWeekMatches = includesDayOfWeek(daysOfWeek, parts.dayOfWeek);
	const domWildcard = isWildcard(rawFields[2] ?? '*');
	const dowWildcard = isWildcard(rawFields[4] ?? '*');

	if (!domWildcard && !dowWildcard) return dayOfMonthMatches || dayOfWeekMatches;
	return dayOfMonthMatches && dayOfWeekMatches;
}

function withinBounds(schedule: CronSchedule, date: Date): boolean {
	const time = date.getTime();
	if (schedule.startAt && time < Date.parse(schedule.startAt)) return false;
	if (schedule.endAt && time > Date.parse(schedule.endAt)) return false;
	if (schedule.maxRuns !== undefined && schedule.runCount >= schedule.maxRuns) return false;
	return true;
}

function minuteCeil(date: Date): Date {
	const time = date.getTime();
	return new Date(Math.floor(time / MINUTE_MS) * MINUTE_MS + MINUTE_MS);
}

export class CronNextRunCalculator {
	getNextRun(schedule: CronSchedule, from = new Date()): Date | null {
		if (!schedule.enabled || schedule.status === 'deleted') return null;
		if (schedule.maxRuns !== undefined && schedule.runCount >= schedule.maxRuns) return null;

		switch (schedule.type) {
			case 'cron':
				return this.getNextCronRun(schedule, from);
			case 'interval':
				return this.getNextIntervalRun(schedule, from, false);
			case 'fixedRate':
				return this.getNextIntervalRun(schedule, from, true);
			case 'fixedDelay':
				return this.getNextFixedDelayRun(schedule, from);
			case 'oneTime':
				return this.getNextOneTimeRun(schedule, from);
			case 'calendar':
			case 'manual':
				return null;
		}
	}

	getNextRuns(schedule: CronSchedule, count: number, from = new Date()): Date[] {
		const runs: Date[] = [];
		let cursor = from;
		for (let index = 0; index < count; index++) {
			const next = this.getNextRun({ ...schedule, runCount: schedule.runCount + runs.length }, cursor);
			if (!next) break;
			runs.push(next);
			cursor = next;
		}
		return runs;
	}

	getMissedRuns(schedule: CronSchedule, until: Date, limit: number): Date[] {
		const firstDue = schedule.nextRunAt ? new Date(schedule.nextRunAt) : this.getNextRun(schedule, new Date(schedule.lastEvaluatedAt ?? schedule.createdAt));
		if (!firstDue || firstDue.getTime() > until.getTime()) return [];
		const runs: Date[] = [firstDue];
		let cursor = firstDue;
		while (runs.length < limit) {
			const next = this.getNextRun({ ...schedule, runCount: schedule.runCount + runs.length }, cursor);
			if (!next || next.getTime() > until.getTime()) break;
			runs.push(next);
			cursor = next;
		}
		return runs;
	}

	private getNextCronRun(schedule: CronSchedule, from: Date): Date | null {
		let cursor = minuteCeil(from);
		for (let index = 0; index < MAX_CRON_SCAN_MINUTES; index++) {
			if (withinBounds(schedule, cursor) && matchesCron(schedule, cursor)) return cursor;
			cursor = new Date(cursor.getTime() + MINUTE_MS);
		}
		return null;
	}

	private getNextIntervalRun(schedule: CronSchedule, from: Date, fixedRate: boolean): Date | null {
		if (!schedule.intervalMs) return null;
		const anchor = Date.parse(schedule.startAt ?? schedule.createdAt);
		const fromTime = from.getTime();
		if (anchor > fromTime) {
			const next = new Date(anchor);
			return withinBounds(schedule, next) ? next : null;
		}

		const base = fixedRate
			? anchor
			: Date.parse(schedule.lastRunAt ?? schedule.lastEvaluatedAt ?? schedule.startAt ?? schedule.createdAt);
		const elapsed = Math.max(0, fromTime - base);
		const periods = Math.floor(elapsed / schedule.intervalMs) + 1;
		const next = new Date(base + periods * schedule.intervalMs);
		return withinBounds(schedule, next) ? next : null;
	}

	private getNextFixedDelayRun(schedule: CronSchedule, from: Date): Date | null {
		if (!schedule.intervalMs) return null;
		const base = Date.parse(
			schedule.lastSuccessfulRunAt ?? schedule.lastRunAt ?? schedule.startAt ?? schedule.createdAt
		);
		const nextTime = Math.max(base + schedule.intervalMs, from.getTime() + schedule.intervalMs);
		const next = new Date(nextTime);
		return withinBounds(schedule, next) ? next : null;
	}

	private getNextOneTimeRun(schedule: CronSchedule, from: Date): Date | null {
		if (!schedule.runAt || schedule.runCount > 0 || schedule.status === 'completed') return null;
		const runAt = new Date(schedule.runAt);
		if (runAt.getTime() <= from.getTime()) return null;
		return withinBounds(schedule, runAt) ? runAt : null;
	}
}
