import type { SearchRequest, SearchResponse } from '../../../shared/search_types';

export async function searchBrave(
	request: Required<SearchRequest>,
	apiKey: string,
	signal?: AbortSignal
): Promise<SearchResponse> {
	const url = new URL('https://api.search.brave.com/res/v1/web/search');
	url.searchParams.set('q', request.query);
	url.searchParams.set('count', String(request.count));

	const response = await fetch(url, {
		signal,
		headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey },
	});
	if (!response.ok) {
		throw new Error(`Brave search failed (${response.status}): ${response.statusText}`);
	}

	const data = (await response.json()) as {
		web?: { results?: { title?: string; url?: string; description?: string }[] };
	};
	return {
		query: request.query,
		results: (data.web?.results ?? []).map((result) => ({
			title: result.title ?? '',
			url: result.url ?? '',
			description: result.description ?? '',
		})),
	};
}
