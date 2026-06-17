import { Tool } from '../core/tool';
import { runWebSearch } from './web-search/runtime';

export class WebSearchTool extends Tool {
	readonly name = 'web_search';
	readonly label = 'Web Search';
	readonly description =
		'Search the web for current information. Returns titles, URLs, and snippets from the best available provider (Brave, Perplexity, or DuckDuckGo).';
	readonly schema = {
		type: 'object',
		required: ['query'],
		additionalProperties: false,
		properties: {
			query: {
				type: 'string',
				description: 'Search query string.',
			},
			count: {
				type: 'number',
				description: 'Number of results to return (default 5).',
			},
			country: {
				type: 'string',
				description: 'Country code for localised results (e.g. "US", "DE").',
			},
			language: {
				type: 'string',
				description: 'Preferred result language (e.g. "en", "de").',
			},
			freshness: {
				type: 'string',
				description: 'Freshness filter: "pd" (past day), "pw" (past week), "pm" (past month).',
			},
			date_after: {
				type: 'string',
				description: 'Return results published after this date (YYYY-MM-DD).',
			},
			date_before: {
				type: 'string',
				description: 'Return results published before this date (YYYY-MM-DD).',
			},
			search_lang: {
				type: 'string',
				description: 'Brave-specific: language of search results.',
			},
			ui_lang: {
				type: 'string',
				description: 'Brave-specific: UI language for the search response.',
			},
			domain_filter: {
				type: 'string',
				description: 'Perplexity-specific: restrict results to this domain.',
			},
			max_tokens: {
				type: 'number',
				description: 'Perplexity-specific: maximum tokens in the response.',
			},
			max_tokens_per_page: {
				type: 'number',
				description: 'Perplexity-specific: maximum tokens per source page.',
			},
		},
	};

	async run(input: Record<string, unknown>): Promise<unknown> {
		const query = input.query;
		if (typeof query !== 'string' || !query.trim()) {
			throw new Error('web_search requires a non-empty query.');
		}

		return runWebSearch({
			query: query.trim(),
			count: typeof input.count === 'number' ? input.count : undefined,
			country: typeof input.country === 'string' ? input.country : undefined,
			language: typeof input.language === 'string' ? input.language : undefined,
			freshness: typeof input.freshness === 'string' ? input.freshness : undefined,
			date_after: typeof input.date_after === 'string' ? input.date_after : undefined,
			date_before: typeof input.date_before === 'string' ? input.date_before : undefined,
			search_lang: typeof input.search_lang === 'string' ? input.search_lang : undefined,
			ui_lang: typeof input.ui_lang === 'string' ? input.ui_lang : undefined,
			domain_filter: typeof input.domain_filter === 'string' ? input.domain_filter : undefined,
			max_tokens: typeof input.max_tokens === 'number' ? input.max_tokens : undefined,
			max_tokens_per_page:
				typeof input.max_tokens_per_page === 'number' ? input.max_tokens_per_page : undefined,
		});
	}
}
