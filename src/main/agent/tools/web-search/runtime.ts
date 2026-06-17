import { duckduckgoSearch } from './providers/duckduckgo';
import { braveSearch } from './providers/brave';
import { perplexitySearch } from './providers/perplexity';

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

export interface WebSearchResult {
	provider: string;
	results: SearchResult[];
}

export interface SearchParams {
	query: string;
	count?: number;
	country?: string;
	language?: string;
	freshness?: string;
	date_after?: string;
	date_before?: string;
	search_lang?: string;
	ui_lang?: string;
	domain_filter?: string;
	max_tokens?: number;
	max_tokens_per_page?: number;
}

interface ProviderCandidate {
	id: string;
	apiKey?: string;
	run: (params: SearchParams, apiKey?: string) => Promise<WebSearchResult>;
}

function resolveCandidates(): ProviderCandidate[] {
	const candidates: ProviderCandidate[] = [];

	const braveKey = process.env.BRAVE_API_KEY;
	if (braveKey) {
		candidates.push({
			id: 'brave',
			apiKey: braveKey,
			run: (p, key) => braveSearch(p, key!),
		});
	}

	const perplexityKey = process.env.PERPLEXITY_API_KEY;
	if (perplexityKey) {
		candidates.push({
			id: 'perplexity',
			apiKey: perplexityKey,
			run: (p, key) => perplexitySearch(p, key!),
		});
	}

	candidates.push({ id: 'duckduckgo', run: duckduckgoSearch });

	return candidates;
}

const MISSING_KEY_CODES = new Set(['missing_brave_api_key', 'missing_perplexity_api_key']);

function isMissingKeyError(error: unknown): boolean {
	return (
		error instanceof Error &&
		typeof (error as Record<string, unknown>).code === 'string' &&
		MISSING_KEY_CODES.has((error as Record<string, unknown>).code as string)
	);
}

export async function runWebSearch(params: SearchParams): Promise<WebSearchResult> {
	const candidates = resolveCandidates();
	let lastError: unknown;

	for (const candidate of candidates) {
		try {
			return await candidate.run(params, candidate.apiKey);
		} catch (error) {
			lastError = error;
			if (isMissingKeyError(error)) continue;
			throw error;
		}
	}

	throw lastError ?? new Error('No web search provider available.');
}
