import type { AgentHeartbeatConfig } from '../../shared/heartbeat';

const ACTIVE_HOURS_TIME_RE = /^(?:([01]\d|2[0-3]):([0-5]\d)|24:00)$/;

function parseActiveHoursTime(raw: string | undefined, allow24: boolean): number | null {
	if (!raw || !ACTIVE_HOURS_TIME_RE.test(raw)) return null;
	const [hourStr, minuteStr] = raw.split(':');
	const hour = Number(hourStr);
	const minute = Number(minuteStr);
	if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
	if (hour === 24) return allow24 && minute === 0 ? 24 * 60 : null;
	return hour * 60 + minute;
}

export function resolveActiveHoursTimezone(raw?: string): string {
	const trimmed = raw?.trim();
	if (!trimmed || trimmed === 'local' || trimmed === 'user') {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	}
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
		return trimmed;
	} catch {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	}
}

function resolveMinutesInTimeZone(nowMs: number, timeZone: string): number | null {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		}).formatToParts(new Date(nowMs));
		const map: Record<string, string> = {};
		for (const part of parts) {
			if (part.type !== 'literal') map[part.type] = part.value;
		}
		const hour = Number(map.hour);
		const minute = Number(map.minute);
		return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : null;
	} catch {
		return null;
	}
}

export function isWithinActiveHours(
	activeHours: AgentHeartbeatConfig['activeHours'] | undefined,
	nowMs = Date.now()
): boolean {
	if (!activeHours) return true;
	const startMin = parseActiveHoursTime(activeHours.start, false);
	const endMin = parseActiveHoursTime(activeHours.end, true);
	if (startMin === null || endMin === null) return true;
	if (startMin === endMin) return false;
	const currentMin = resolveMinutesInTimeZone(nowMs, resolveActiveHoursTimezone(activeHours.timezone));
	if (currentMin === null) return true;
	if (endMin > startMin) return currentMin >= startMin && currentMin < endMin;
	return currentMin >= startMin || currentMin < endMin;
}

export function activeHoursIdentity(activeHours: AgentHeartbeatConfig['activeHours'] | undefined): string {
	if (!activeHours) return '';
	return [activeHours.start ?? '', activeHours.end ?? '', activeHours.timezone ?? ''].join('|');
}
