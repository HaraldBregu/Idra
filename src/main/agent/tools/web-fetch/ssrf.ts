import dns from 'node:dns/promises';

// Covers loopback, private, link-local, ULA, and unspecified
const PRIVATE_IP_RE =
	/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|100\.6[4-9]\.|100\.[7-9]\d\.|100\.1[0-1]\d\.|0\.0\.0\.0|::1$|::$|fe[89ab][0-9a-f]:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function normalizeIpv4Mapped(addr: string): string {
	// ::ffff:192.168.1.1 → 192.168.1.1
	const m = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
	return m ? m[1] : addr;
}

function isPrivateAddress(raw: string): boolean {
	const addr = normalizeIpv4Mapped(raw.toLowerCase());
	return BLOCKED_HOSTNAMES.has(addr) || PRIVATE_IP_RE.test(addr);
}

async function assertSafeHost(hostname: string): Promise<void> {
	if (BLOCKED_HOSTNAMES.has(hostname) || PRIVATE_IP_RE.test(hostname)) {
		throw new Error(`web_fetch: URL targets a private or reserved address — ${hostname}`);
	}

	let addrs: dns.LookupAddress[];
	try {
		addrs = await dns.lookup(hostname, { all: true });
	} catch {
		throw new Error(`web_fetch: could not resolve hostname — ${hostname}`);
	}

	for (const { address } of addrs) {
		if (isPrivateAddress(address)) {
			throw new Error(
				`web_fetch: hostname '${hostname}' resolves to a private address — ${address}`
			);
		}
	}
}

export async function assertSafeUrl(raw: string): Promise<URL> {
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`web_fetch: invalid URL — ${raw}`);
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error(`web_fetch: only http/https URLs are allowed, got '${parsed.protocol}'`);
	}

	await assertSafeHost(parsed.hostname.toLowerCase());

	return parsed;
}
