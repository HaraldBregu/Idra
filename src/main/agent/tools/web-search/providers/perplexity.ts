import type { SearchParams, SearchResult, WebSearchResult } from '../runtime';

interface PerplexityChoice {
	message?: { content?: string };
}

interface PerplexityResponse {
	choices?: PerplexityChoice[];
	citations?: string[];
}

export async function perplexitySearch(
	params: SearchParams,
	apiKey: string
): Promise<WebSearchResult> {
	const { query, max_tokens = 1024, domain_filter } = params;

	const messages = [{ role: 'user', content: query }];
	const body: Record<string, unknown> = {
		model: 'sonar',
		messages,
		max_tokens,
	};
	if (domain_filter) body.search_domain_filter = [domain_filter];

	const response = await fetch('https://api.perplexity.ai/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		if (response.status === 401 || response.status === 403) {
			throw Object.assign(new Error('missing_perplexity_api_key'), {
				code: 'missing_perplexity_api_key',
			});
		}
		throw new Error(`Perplexity search failed: HTTP ${response.status} ${text}`);
	}

	const data = (await response.json()) as PerplexityResponse;
	const content = data.choices?.[0]?.message?.content ?? '';
	const citations = data.citations ?? [];

	const results: SearchResult[] = [
		{
			title: query,
			url: citations[0] ?? '',
			snippet: content,
		},
		...citations.slice(1).map((url, i) => ({ title: `Source ${i + 2}`, url, snippet: '' })),
	];

	return { provider: 'perplexity', results };
}
