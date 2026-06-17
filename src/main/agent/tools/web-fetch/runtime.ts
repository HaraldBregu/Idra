import { assertSafeUrl } from './ssrf';
import { htmlToMarkdown, htmlToText } from './html';
import { jinaFetch } from './providers/jina';
import { firecrawlFetch } from './providers/firecrawl';

export interface FetchParams {
	url: string;
	extractMode: 'markdown' | 'text';
	maxChars: number;
}

export interface WebFetchResult {
	provider: 'direct' | 'jina' | 'firecrawl';
	content: string;
	contentType: string;
}

export interface WebFetchOutput {
	url: string;
	content: string;
	provider: WebFetchResult['provider'];
	extractMode: FetchParams['extractMode'];
	truncated: boolean;
	_externalContent: true;
}

const CHROME_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// Follow redirects manually so each hop is validated against SSRF rules.
async function fetchWithSafeRedirects(url: string, signal: AbortSignal): Promise<Response> {
	let currentUrl = url;
	let hopsLeft = MAX_REDIRECTS;

	const headers = {
		'User-Agent': CHROME_UA,
		'Accept': 'text/markdown, text/html;q=0.9, */*;q=0.1',
	};

	while (true) {
		const response = await fetch(currentUrl, { redirect: 'manual', signal, headers });

		if (!REDIRECT_STATUSES.has(response.status)) {
			return response;
		}

		if (hopsLeft <= 0) {
			throw new Error(`web_fetch: too many redirects (limit ${MAX_REDIRECTS})`);
		}

		const location = response.headers.get('location');
		if (!location) {
			throw new Error('web_fetch: redirect response missing Location header');
		}

		// Resolve relative Location against the current URL, then SSRF-check the target.
		const next = new URL(location, currentUrl).toString();
		await assertSafeUrl(next);
		currentUrl = next;
		hopsLeft--;
	}
}

async function directFetch(params: FetchParams, signal: AbortSignal): Promise<WebFetchResult> {
	const response = await fetchWithSafeRedirects(params.url, signal);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}

	const rawContentType = response.headers.get('content-type') ?? '';
	const contentType = rawContentType.split(';')[0].trim().toLowerCase();

	let content: string;

	if (contentType === 'text/markdown' || rawContentType.includes('cf-markdown')) {
		content = await response.text();
	} else if (contentType === 'application/json') {
		const json = await response.json();
		content = JSON.stringify(json, null, 2);
	} else if (contentType === 'text/html' || contentType === 'application/xhtml+xml') {
		const html = await response.text();
		content = params.extractMode === 'text' ? htmlToText(html) : htmlToMarkdown(html);
	} else {
		content = await response.text();
	}

	return { provider: 'direct', content, contentType };
}

const MISSING_KEY_CODES = new Set(['missing_firecrawl_api_key']);

function isMissingKeyError(err: unknown): boolean {
	return (
		err instanceof Error &&
		MISSING_KEY_CODES.has((err as Record<string, unknown>).code as string)
	);
}

export async function runWebFetch(params: FetchParams): Promise<WebFetchOutput> {
	await assertSafeUrl(params.url);

	const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);

	let result: WebFetchResult | undefined;
	let directError: unknown;

	try {
		result = await directFetch(params, timeout);
	} catch (err) {
		directError = err;
	}

	if (!result) {
		// Fallback: Jina (free, no key needed)
		try {
			result = await jinaFetch(params, AbortSignal.timeout(FETCH_TIMEOUT_MS));
		} catch {
			// ignore, try next
		}
	}

	if (!result) {
		// Fallback: Firecrawl (keyed)
		const firecrawlKey = process.env.FIRECRAWL_API_KEY;
		if (firecrawlKey) {
			try {
				result = await firecrawlFetch(params, firecrawlKey, AbortSignal.timeout(FETCH_TIMEOUT_MS));
			} catch (err) {
				if (!isMissingKeyError(err)) throw err;
			}
		}
	}

	if (!result) {
		const msg = directError instanceof Error ? directError.message : String(directError);
		throw new Error(`web_fetch: all providers failed. Direct error: ${msg}`);
	}

	const truncated = result.content.length > params.maxChars;
	const content = truncated ? result.content.slice(0, params.maxChars) : result.content;

	return {
		url: params.url,
		content,
		provider: result.provider,
		extractMode: params.extractMode,
		truncated,
		_externalContent: true,
	};
}
