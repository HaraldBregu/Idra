export function isTransientModelError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const candidate = error as { status?: unknown; code?: unknown; name?: unknown };
	if (candidate.status === 408 || candidate.status === 409 || candidate.status === 429) return true;
	if (typeof candidate.status === 'number' && candidate.status >= 500) return true;
	return (
		candidate.code === 'ECONNRESET' ||
		candidate.code === 'ETIMEDOUT' ||
		candidate.code === 'EAI_AGAIN' ||
		candidate.name === 'TimeoutError'
	);
}
