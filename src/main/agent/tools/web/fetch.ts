import dns from 'node:dns/promises';
import net from 'node:net';
import { z } from 'zod';
import { tool } from '../tool';

const MAX_CHARS_DEFAULT = 20_000;
const TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

const BLOCKED = new net.BlockList();
BLOCKED.addSubnet('0.0.0.0', 8);
BLOCKED.addSubnet('10.0.0.0', 8);
BLOCKED.addSubnet('100.64.0.0', 10);
BLOCKED.addSubnet('127.0.0.0', 8);
BLOCKED.addSubnet('169.254.0.0', 16);
BLOCKED.addSubnet('172.16.0.0', 12);
BLOCKED.addSubnet('192.168.0.0', 16);
BLOCKED.addAddress('::1', 'ipv6');
BLOCKED.addSubnet('fc00::', 7, 'ipv6');
BLOCKED.addSubnet('fe80::', 10, 'ipv6');

// ponytail: validates then fetches by hostname (DNS rebinding TOCTOU remains);
// pin the resolved IP via a custom agent if that matters
async function assertPublicHost(hostname: string, signal?: AbortSignal): Promise<void> {
	signal?.throwIfAborted();
	const host = hostname.toLowerCase().replace(/\.$/, '');
	if (host === 'localhost' || host.endsWith('.localhost'))
		throw new Error(`web_fetch blocked: ${hostname} is not a public host`);
	const addresses = await dns.lookup(host, { all: true });
	signal?.throwIfAborted();
	for (const { address } of addresses) {
		const v4 = address.replace(/^::ffff:/i, '');
		const blocked = net.isIPv4(v4) ? BLOCKED.check(v4, 'ipv4') : BLOCKED.check(address, 'ipv6');
		if (blocked) throw new Error(`web_fetch blocked: ${hostname} resolves to a private address`);
	}
}

// ponytail: regex-based HTML-to-text; add a readability lib if extraction quality matters
function htmlToText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr)[^>]*>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/[ \t]+/g, ' ')
		.replace(/\n\s*\n+/g, '\n\n')
		.trim();
}

export const webFetchTool = tool({
	id: 'web_fetch',
	name: 'Web fetch',
	description:
		'Fetch an HTTP(S) URL and return its readable text content. HTML is converted to plain text; JSON is pretty-printed.',
	inputSchema: z.object({
		url: z.string().url().describe('HTTP(S) URL to fetch.'),
		maxChars: z
			.number()
			.int()
			.min(100)
			.optional()
			.describe(
				`Max characters returned (default ${MAX_CHARS_DEFAULT}); longer content is truncated.`
			),
	}),
	execute: async ({ url, maxChars }, signal) => {
		let current = new URL(url);
		let res: Response;
		for (let hop = 0; ; hop++) {
			if (current.protocol !== 'http:' && current.protocol !== 'https:')
				throw new Error('Invalid URL: must be http or https');
			await assertPublicHost(current.hostname, signal);
			const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
			res = await fetch(current, {
				redirect: 'manual',
				signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
				headers: {
					Accept: 'text/html, application/json;q=0.9, */*;q=0.1',
					'Accept-Language': 'en-US,en;q=0.9',
				},
			});
			if (res.status >= 300 && res.status < 400) {
				const location = res.headers.get('location');
				if (!location) throw new Error(`web_fetch failed (${res.status}): missing Location header`);
				if (hop >= MAX_REDIRECTS) throw new Error('web_fetch failed: too many redirects');
				current = new URL(location, current);
				continue;
			}
			break;
		}
		if (!res.ok) throw new Error(`web_fetch failed (${res.status}): ${res.statusText}`);

		const contentType = res.headers.get('content-type') ?? '';
		const body = await res.text();

		let text = body;
		if (contentType.includes('text/html')) {
			text = htmlToText(body);
		} else if (contentType.includes('application/json')) {
			try {
				text = JSON.stringify(JSON.parse(body), null, 2);
			} catch {
				text = body;
			}
		}

		const limit = maxChars ?? MAX_CHARS_DEFAULT;
		const truncated = text.length > limit;
		if (truncated) text = text.slice(0, limit);

		return JSON.stringify(
			{ url, finalUrl: current.toString(), status: res.status, contentType, truncated, text },
			null,
			2
		);
	},
});
