const MAX_RETRY_DELAY_MS = 30_000;

export function retryAfterMs(error: unknown, now = Date.now()): number | undefined {
	if (!error || typeof error !== 'object') return undefined;
	const candidate = error as {
		headers?: unknown;
		response?: { headers?: unknown };
	};
	const headers = candidate.headers ?? candidate.response?.headers;
	let value: unknown;
	if (headers instanceof Headers) value = headers.get('retry-after');
	else if (headers && typeof headers === 'object') {
		const record = headers as Record<string, unknown>;
		value = record['retry-after'] ?? record['Retry-After'];
	}
	if (Array.isArray(value)) value = value[0];
	if (typeof value !== 'string' && typeof value !== 'number') return undefined;
	const seconds = Number(value);
	const parsed = Number.isFinite(seconds)
		? Math.max(0, seconds * 1_000)
		: Math.max(0, Date.parse(String(value)) - now);
	return Number.isFinite(parsed) ? Math.min(parsed, MAX_RETRY_DELAY_MS) : undefined;
}
