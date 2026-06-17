import type { FetchParams, WebFetchResult } from '../runtime';

interface FirecrawlResponse {
	success?: boolean;
	data?: { markdown?: string; content?: string };
	error?: string;
}

export async function firecrawlFetch(
	params: FetchParams,
	apiKey: string,
	signal: AbortSignal
): Promise<WebFetchResult> {
	const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			url: params.url,
			formats: [params.extractMode === 'text' ? 'markdown' : 'markdown'],
		}),
		signal,
	});

	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw Object.assign(new Error('missing_firecrawl_api_key'), {
				code: 'missing_firecrawl_api_key',
			});
		}
		throw new Error(`Firecrawl fetch failed: HTTP ${response.status}`);
	}

	const data = (await response.json()) as FirecrawlResponse;
	if (!data.success) {
		throw new Error(`Firecrawl error: ${data.error ?? 'unknown'}`);
	}

	const content = data.data?.markdown ?? data.data?.content ?? '';
	return { provider: 'firecrawl', content, contentType: 'text/markdown' };
}
