const DURATION_TOKEN_RE = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gi;
const UNIT_MS: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 60_000,
	h: 60 * 60_000,
	d: 24 * 60 * 60_000,
};

export function parseHeartbeatDurationMs(raw: string | undefined, defaultUnit = 'm'): number | null {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
		const unitMs = UNIT_MS[defaultUnit] ?? UNIT_MS.m;
		const value = Number(trimmed) * unitMs;
		return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
	}

	let total = 0;
	let consumed = '';
	for (const match of trimmed.matchAll(DURATION_TOKEN_RE)) {
		const value = Number(match[1]);
		const unit = match[2]?.toLowerCase() ?? defaultUnit;
		const unitMs = UNIT_MS[unit];
		if (!Number.isFinite(value) || !unitMs) return null;
		total += value * unitMs;
		consumed += match[0];
	}

	if (consumed.replace(/\s+/g, '') !== trimmed.replace(/\s+/g, '')) return null;
	return Number.isFinite(total) && total > 0 ? Math.floor(total) : null;
}
