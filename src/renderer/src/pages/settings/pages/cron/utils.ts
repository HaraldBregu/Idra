import type { CronJsonValue, CronStoredSchedule } from '../../../../../../shared/cron';

export function formatTimestamp(value: number | string | undefined): string {
	if (value === undefined || value === '') return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

export function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return '—';
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

function formatDetailValue(value: unknown): string {
	if (value === undefined || value === null || value === '') return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

export function formatSchedule(schedule: CronStoredSchedule): string {
	if (typeof schedule === 'string') return schedule;
	const type = typeof schedule.type === 'string' ? schedule.type : 'schedule';
	if (type === 'interval' && typeof schedule.intervalMs === 'number') {
		return `Every ${formatDuration(schedule.intervalMs)}`;
	}
	if (type === 'oneTime' && typeof schedule.runAt === 'string') {
		return formatTimestamp(schedule.runAt);
	}
	return JSON.stringify(schedule);
}

export function payloadSummary(payload: CronJsonValue): string {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return formatDetailValue(payload);
	if (typeof payload.message === 'string') return payload.message;
	if (typeof payload.text === 'string') return payload.text;
	return JSON.stringify(payload);
}

export function payloadEntries(payload: CronJsonValue): readonly (readonly [string, string])[] {
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];
	return Object.entries(payload)
		.filter(([key]) => !['message', 'text'].includes(key))
		.map(([key, value]) => [key, formatDetailValue(value)] as const)
		.filter(([, value]) => value !== '—');
}
