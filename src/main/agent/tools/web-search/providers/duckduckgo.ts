import type { SearchParams, SearchResult, WebSearchResult } from '../runtime';

export async function duckduckgoSearch(params: SearchParams): Promise<WebSearchResult> {
	const { query, count = 5, country, language } = params;

	const body = new URLSearchParams({ q: query });
	if (country) body.set('kl', country);

	const response = await fetch('https://lite.duckduckgo.com/lite/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': 'Mozilla/5.0 (compatible; FridayAgent/1.0)',
			'Accept-Language': language ?? 'en-US,en;q=0.9',
		},
		body: body.toString(),
	});

	if (!response.ok) {
		throw new Error(`DuckDuckGo search failed: HTTP ${response.status}`);
	}

	const html = await response.text();
	const results = parseLiteHtml(html, count);

	return { provider: 'duckduckgo', results };
}

function parseLiteHtml(html: string, count: number): SearchResult[] {
	const results: SearchResult[] = [];

	const linkRe = /<a[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
	const snippetRe = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;

	const links: Array<{ url: string; title: string }> = [];
	let m: RegExpExecArray | null;

	while ((m = linkRe.exec(html)) !== null) {
		const url = m[1];
		const title = decodeHtml(m[2]);
		if (url && title) links.push({ url, title });
	}

	const snippets: string[] = [];
	while ((m = snippetRe.exec(html)) !== null) {
		snippets.push(decodeHtml(m[1]));
	}

	for (let i = 0; i < Math.min(links.length, count); i++) {
		results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] ?? '' });
	}

	return results;
}

function decodeHtml(raw: string): string {
	return raw
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}
