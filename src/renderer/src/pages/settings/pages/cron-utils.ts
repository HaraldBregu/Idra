import type { OpenClawCronJob, OpenClawCronPayload, OpenClawCronSchedule } from '../../../../../shared/cron';

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

export function formatSchedule(schedule: OpenClawCronSchedule): string {
	switch (schedule.kind) {
		case 'at':
			return formatTimestamp(schedule.at);
		case 'every':
			return `Every ${formatDuration(schedule.everyMs)}`;
		case 'cron': {
			const timezone = schedule.tz ? ` ${schedule.tz}` : '';
			const stagger = schedule.staggerMs ? ` +${formatDuration(schedule.staggerMs)}` : '';
			return `${schedule.expr}${timezone}${stagger}`;
		}
	}
}

export function payloadSummary(payload: OpenClawCronPayload): string {
	return payload.kind === 'systemEvent' ? payload.text : payload.message;
}

export function deliverySummary(job: OpenClawCronJob): string {
	if (job.delivery.mode === 'none') return 'none';
	const target = [job.delivery.channel, job.delivery.to, job.delivery.threadId]
		.filter(Boolean)
		.join(' ');
	return target ? `${job.delivery.mode}: ${target}` : job.delivery.mode;
}

export function payloadEntries(payload: OpenClawCronPayload): readonly (readonly [string, string])[] {
	return Object.entries(payload)
		.filter(([key]) => !['kind', 'message', 'text'].includes(key))
		.map(([key, value]) => [key, formatDetailValue(value)] as const)
		.filter(([, value]) => value !== '—');
}

export function isOpenClawCronJob(value: unknown): value is OpenClawCronJob {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { id?: unknown }).id === 'string' &&
		typeof (value as { name?: unknown }).name === 'string' &&
		typeof (value as { enabled?: unknown }).enabled === 'boolean' &&
		typeof (value as { payload?: unknown }).payload === 'object' &&
		(value as { payload?: unknown }).payload !== null &&
		typeof (value as { schedule?: unknown }).schedule === 'object' &&
		(value as { schedule?: unknown }).schedule !== null &&
		typeof (value as { state?: unknown }).state === 'object' &&
		(value as { state?: unknown }).state !== null
	);
}
