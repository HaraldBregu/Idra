import type { CronJsonObject, CronJsonValue } from '../core/cron.types';

const SENSITIVE_KEY_PATTERN =
	/(api[-_]?key|token|secret|password|credential|authorization|cookie|oauth|private[-_]?key|payment|card|body|content)/i;

export function redactCronValue(value: CronJsonValue, depth = 0): CronJsonValue {
	if (depth > 6) return '[redacted-depth-limit]';
	if (Array.isArray(value)) return value.map((entry) => redactCronValue(entry, depth + 1));
	if (value && typeof value === 'object') {
		const redacted: CronJsonObject = {};
		for (const [key, child] of Object.entries(value)) {
			redacted[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactCronValue(child, depth + 1);
		}
		return redacted;
	}
	if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}...[truncated]`;
	return value;
}

export function summarizeCronValue(value: CronJsonValue): CronJsonObject {
	if (Array.isArray(value)) return { kind: 'array', length: value.length };
	if (value && typeof value === 'object') {
		return {
			kind: 'object',
			keys: Object.keys(value).slice(0, 25),
		};
	}
	return { kind: typeof value, value: redactCronValue(value) };
}
