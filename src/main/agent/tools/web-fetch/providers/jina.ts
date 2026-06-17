import type { FetchParams, WebFetchResult } from '../runtime';

export async function jinaFetch(params: FetchParams, signal: AbortSignal): Promise<WebFetchResult> {
	const jinaUrl = `https://r.jina.ai/${params.url}`;

	const headers: Record<string, string> = {
		'Accept': 'text/markdown, text/plain;q=0.9, */*;q=0.1',
		'X-Return-Format': params.extractMode === 'text' ? 'text' : 'markdown',
	};

	const apiKey = process.env.JINA_API_KEY;
	if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

	const response = await fetch(jinaUrl, { headers, signal, redirect: 'follow' });

	if (!response.ok) {
		throw new Error(`Jina fetch failed: HTTP ${response.status}`);
	}

	const content = await response.text();
	return { provider: 'jina', content, contentType: 'text/markdown' };
}
