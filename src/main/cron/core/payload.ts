import type {
	CronJsonValue,
	CronScheduleCreateRequest,
	CronScheduleUpdateRequest,
} from './types';
import { CronScheduleExecutionError } from './errors';
import {
	CRON_RUNTIME_CONFIG_KEY_PATTERN,
	CRON_SECRET_KEY_PATTERN,
	CRON_SECRET_VALUE_PATTERNS,
} from '../constants';

function assertSafeStoredScheduleValue(value: CronJsonValue, path = 'taskInput'): void {
	if (Array.isArray(value)) {
		value.forEach((entry, index) => assertSafeStoredScheduleValue(entry, `${path}[${index}]`));
		return;
	}
	if (typeof value === 'string') {
		if (CRON_SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
			throw new CronScheduleExecutionError(
				`Sensitive value cannot be stored in cron schedule: ${path}`,
				{
					field: path,
				}
			);
		}
		return;
	}
	if (!value || typeof value !== 'object') return;
	for (const [key, child] of Object.entries(value)) {
		if (CRON_SECRET_KEY_PATTERN.test(key)) {
			throw new CronScheduleExecutionError(
				`Sensitive field cannot be stored in cron schedule: ${path}.${key}`,
				{
					field: `${path}.${key}`,
				}
			);
		}
		if (CRON_RUNTIME_CONFIG_KEY_PATTERN.test(key)) {
			throw new CronScheduleExecutionError(
				`Runtime configuration cannot be stored in cron schedule: ${path}.${key}`,
				{
					field: `${path}.${key}`,
				}
			);
		}
		assertSafeStoredScheduleValue(child, `${path}.${key}`);
	}
}

export function assertSafeStoredSchedulePayload(
	request: CronScheduleCreateRequest | CronScheduleUpdateRequest
): void {
	if (request.taskInput !== undefined)
		assertSafeStoredScheduleValue(request.taskInput, 'taskInput');
	if (request.taskMetadata !== undefined)
		assertSafeStoredScheduleValue(request.taskMetadata, 'taskMetadata');
	if (request.metadata !== undefined) assertSafeStoredScheduleValue(request.metadata, 'metadata');
}
