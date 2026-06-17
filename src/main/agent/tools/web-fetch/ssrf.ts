const PRIVATE_IP_RE =
	/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1$|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

export function assertSafeUrl(raw: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`web_fetch: invalid URL — ${raw}`);
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error(`web_fetch: only http/https URLs are allowed, got '${parsed.protocol}'`);
	}

	const hostname = parsed.hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.has(hostname) || PRIVATE_IP_RE.test(hostname)) {
		throw new Error(`web_fetch: URL resolves to a private or reserved address — ${hostname}`);
	}

	return parsed;
}
