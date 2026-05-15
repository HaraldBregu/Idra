import type { JsonObject, JsonValue } from '../core/task.types';

const SECRET_PATTERNS = [
	/\b(password|passcode|api[_-]?key|secret|token)\b\s*(?:=|:|is)\s*([^\s,;]+)/gi,
	/\bBearer\s+[A-Za-z0-9._-]{12,}\b/g,
	/\bsk-[A-Za-z0-9_-]{12,}\b/g,
	/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redactSecrets(value: unknown): unknown {
	if (typeof value === 'string') return redactString(value);
	if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
	if (typeof value === 'object' && value !== null) {
		const next: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(value)) {
			if (/(password|passcode|apiKey|api_key|secret|token|credential|privateKey)/i.test(key)) {
				next[key] = '[REDACTED]';
			} else {
				next[key] = redactSecrets(child);
			}
		}
		return next;
	}
	return value;
}

export function summarizeForAudit(value: unknown, maxLength = 240): string {
	const redacted = redactSecrets(value);
	const text = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
	return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function redactedMetadata(value: JsonObject | undefined): JsonObject {
	return (redactSecrets(value ?? {}) ?? {}) as JsonObject;
}

function redactString(input: string): string {
	let output = input;
	for (const pattern of SECRET_PATTERNS) {
		output = output.replace(pattern, (match) => {
			const label = match.match(/^[A-Za-z _-]+(?=\s*(?:=|:|is))/)?.[0]?.trim();
			return label ? `${label}: [REDACTED]` : '[REDACTED]';
		});
	}
	return output;
}

export function asJsonValue(value: unknown): JsonValue {
	const redacted = redactSecrets(value);
	return JSON.parse(JSON.stringify(redacted)) as JsonValue;
}
