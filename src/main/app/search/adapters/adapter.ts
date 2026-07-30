import type { SearchRequest, SearchResponse } from '../../../../shared/search_types';

export type SearchAdapter = (
	request: Required<SearchRequest>,
	apiKey: string
) => Promise<SearchResponse>;
