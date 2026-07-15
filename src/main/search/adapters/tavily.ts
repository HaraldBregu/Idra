import type { SearchRequest, SearchResponse } from '../../../shared/search_types';

export async function searchTavily(
	request: Required<SearchRequest>,
	apiKey: string
): Promise<SearchResponse> {
	const response = await fetch('https://api.tavily.com/search', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			query: request.query,
			max_results: request.count,
			search_depth: 'basic',
			include_answer: false,
			include_raw_content: false,
		}),
	});
	if (!response.ok) {
		throw new Error(`Tavily search failed (${response.status}): ${response.statusText}`);
	}

	const data = (await response.json()) as {
		results?: { title?: string; url?: string; content?: string }[];
	};
	return {
		query: request.query,
		results: (data.results ?? []).map((result) => ({
			title: result.title ?? '',
			url: result.url ?? '',
			description: result.content ?? '',
		})),
	};
}
