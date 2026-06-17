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

async function directFetch(params: FetchParams, signal: AbortSignal): Promise<WebFetchResult> {
	const response = await fetch(params.url, {
		redirect: 'follow',
		signal,
		headers: {
			'User-Agent': CHROME_UA,
			'Accept': 'text/markdown, text/html;q=0.9, */*;q=0.1',
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}

	// Enforce redirect limit via response.redirected — fetch() follows automatically;
	// we can't count them without a custom agent, so we rely on the OS/Node limit.
	void MAX_REDIRECTS;

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
	assertSafeUrl(params.url);

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
