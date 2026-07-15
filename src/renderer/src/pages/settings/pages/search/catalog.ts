import type { SearchEngineId } from '../../../../../../shared/search_types';

export interface SearchEngineDefinition {
	id: SearchEngineId;
	name: string;
	descriptionKey: string;
	configurationUrl: string;
}

export const SEARCH_ENGINES: readonly SearchEngineDefinition[] = [
	{
		id: 'brave',
		name: 'Brave',
		descriptionKey: 'settings.searchEngine.braveDescription',
		configurationUrl: 'https://api-dashboard.search.brave.com/app/keys',
	},
	{
		id: 'tavily',
		name: 'Tavily',
		descriptionKey: 'settings.searchEngine.tavilyDescription',
		configurationUrl: 'https://app.tavily.com/home',
	},
] as const;
