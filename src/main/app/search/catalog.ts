import type { StoredProvider } from '../../../shared/provider_types';

export const SEARCH_PROVIDERS: readonly Omit<StoredProvider, 'apiKey'>[] = [
	{
		id: 'brave',
		name: 'Brave',
		baseUrl: 'https://api.search.brave.com/res/v1/web/search',
	},
	{
		id: 'tavily',
		name: 'Tavily',
		baseUrl: 'https://api.tavily.com/search',
	},
];
