import type { SearchParams, SearchResult, WebSearchResult } from '../runtime';

interface BraveWebResult {
	title?: string;
	url?: string;
	description?: string;
}

interface BraveResponse {
	web?: { results?: BraveWebResult[] };
}

export async function braveSearch(params: SearchParams, apiKey: string): Promise<WebSearchResult> {
	const { query, count = 5, country, language, search_lang, ui_lang, freshness, date_after, date_before } = params;

	const qs = new URLSearchParams({ q: query, count: String(Math.min(count, 20)) });
	if (country) qs.set('country', country);
	if (search_lang) qs.set('search_lang', search_lang);
	if (ui_lang) qs.set('ui_lang', ui_lang);
	if (language) qs.set('ui_lang', language);
	if (freshness) qs.set('freshness', freshness);
	if (date_after) qs.set('result_filter', `date_after:${date_after}`);
	if (date_before) qs.set('result_filter', `date_before:${date_before}`);

	const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${qs.toString()}`, {
		headers: {
			'Accept': 'application/json',
			'X-Subscription-Token': apiKey,
		},
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		if (response.status === 401 || response.status === 403) {
			throw Object.assign(new Error('missing_brave_api_key'), { code: 'missing_brave_api_key' });
		}
		throw new Error(`Brave search failed: HTTP ${response.status} ${body}`);
	}

	const data = (await response.json()) as BraveResponse;
	const items = data.web?.results ?? [];
	const results: SearchResult[] = items.slice(0, count).map((r) => ({
		title: r.title ?? '',
		url: r.url ?? '',
		snippet: r.description ?? '',
	}));

	return { provider: 'brave', results };
}
