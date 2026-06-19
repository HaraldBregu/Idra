import type { CronJsonObject, CronSchedule } from '../core';

export function resolvePrompt(schedule: CronSchedule): string {
	const input = schedule.taskInput;
	if (typeof input === 'string' && input.trim()) return input;
	if (input && typeof input === 'object' && !Array.isArray(input)) {
		const message = (input as CronJsonObject).message;
		if (typeof message === 'string' && message.trim()) return message;
	}
	return schedule.description?.trim() || schedule.name;
}
