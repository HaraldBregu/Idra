const SECRET_KEY = /(?:authorization|api[_-]?key|client[_-]?secret|password|refresh[_-]?token|token)/i;

export function redactApprovalInput(input: Record<string, unknown>): Record<string, unknown> {
	const redact = (value: unknown, key = '', depth = 0): unknown => {
		if (SECRET_KEY.test(key)) return '[REDACTED]';
		if (depth >= 6) return '[TRUNCATED]';
		if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, key, depth + 1));
		if (!value || typeof value !== 'object') return value;
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.slice(0, 100)
				.map(([childKey, child]) => [childKey, redact(child, childKey, depth + 1)])
		);
	};
	return redact(input) as Record<string, unknown>;
}
