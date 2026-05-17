const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);

export function normalizeExternalUrl(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		const url = new URL(trimmed);
		return ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol) ? url.toString() : null;
	} catch {
		return null;
	}
}
