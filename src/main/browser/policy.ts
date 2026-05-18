const BLOCKED_HOSTS = new Set([
	'localhost',
	'::1',
	'0.0.0.0',
	'169.254.169.254',
	'metadata.google.internal',
]);

const PRIVATE_RANGES = [
	/^127\./,
	/^10\./,
	/^192\.168\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^169\.254\./,
	/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
	/^fc00:/i,
	/^fe80:/i,
];

export type UrlValidationResult = { ok: true; url: URL } | { ok: false; reason: string };

export function validateUrl(raw: string): UrlValidationResult {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		return { ok: false, reason: 'invalid URL' };
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return { ok: false, reason: 'only http and https URLs are allowed' };
	}
	const host = parsed.hostname.toLowerCase();
	if (BLOCKED_HOSTS.has(host)) {
		return { ok: false, reason: `blocked host: ${host}` };
	}
	for (const pattern of PRIVATE_RANGES) {
		if (pattern.test(host)) {
			return { ok: false, reason: 'blocked: private/local IP range' };
		}
	}
	return { ok: true, url: parsed };
}
