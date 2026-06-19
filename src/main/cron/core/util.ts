import type { CronSchedule } from './types';

export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export function matchesValue<T extends string>(
	candidate: T | undefined,
	expected: T | T[] | undefined
): boolean {
	if (!expected) return true;
	if (!candidate) return false;
	return Array.isArray(expected) ? expected.includes(candidate) : candidate === expected;
}

export function isActiveSchedule(schedule: CronSchedule): boolean {
	return schedule.status === 'active' && schedule.enabled && !schedule.deletedAt;
}
