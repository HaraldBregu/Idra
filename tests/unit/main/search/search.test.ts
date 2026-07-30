jest.mock('electron-store', () =>
	jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		let backing = structuredClone(options.defaults ?? {});
		return {
			get(key: string) {
				return (backing as Record<string, unknown>)[key];
			},
			set(key: string, value: unknown) {
				(backing as Record<string, unknown>)[key] = value;
			},
			get store() {
				return backing;
			},
			set store(value: unknown) {
				backing = value;
			},
		};
	})
);

import { getWebSearchTools } from '../../../../src/main/agent/tools/web/search';
import { searchBrave } from '../../../../src/main/app/search/adapters/brave';
import { searchTavily } from '../../../../src/main/app/search/adapters/tavily';
import { getSearchKey } from '../../../../src/main/app/search/search_get_key';
import { getSearchSettings } from '../../../../src/main/app/search/search_get_settings';
import { saveSearchEngine } from '../../../../src/main/app/search/search_save_engine';
import { selectSearchEngine } from '../../../../src/main/app/search/search_select_engine';
import { getSearchProviders, setSearchProviders } from '../../../../src/main/app/search/search_store';
import { searchWeb } from '../../../../src/main/app/search/search_web';

const originalFetch = global.fetch;

function response(body: unknown, status = 200, statusText = 'OK'): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		json: jest.fn().mockResolvedValue(body),
	} as unknown as Response;
}

beforeEach(() => {
	setSearchProviders([]);
	delete process.env.BRAVE_API_KEY;
	delete process.env.TAVILY_API_KEY;
	global.fetch = jest.fn();
});

afterAll(() => {
	global.fetch = originalFetch;
});

describe('search settings', () => {
	it('stores providers independently and preserves explicit selection', () => {
		expect(getSearchSettings()).toEqual({
			engineId: 'brave',
			configured: { brave: false, tavily: false },
		});

		expect(saveSearchEngine('tavily', { apiKey: ' tavily-key ' })).toEqual({
			engineId: 'tavily',
			configured: { brave: false, tavily: true },
		});
		saveSearchEngine('brave', { apiKey: 'brave-key' });
		expect(getSearchProviders()).toEqual([
			{
				id: 'tavily',
				name: 'Tavily',
				baseUrl: 'https://api.tavily.com/search',
				apiKey: 'tavily-key',
			},
			{
				id: 'brave',
				name: 'Brave',
				baseUrl: 'https://api.search.brave.com/res/v1/web/search',
				apiKey: 'brave-key',
			},
		]);
		expect(getSearchSettings().engineId).toBe('tavily');
		expect(getSearchKey('tavily')).toBe('tavily-key');
		expect(selectSearchEngine('brave').engineId).toBe('brave');
		expect(getSearchProviders().map((provider) => provider.id)).toEqual(['brave', 'tavily']);
	});

	it('rejects empty credentials and unconfigured selections', () => {
		expect(() => saveSearchEngine('brave', { apiKey: ' ' })).toThrow('API key is required');
		expect(() => selectSearchEngine('tavily')).toThrow('Configure this search engine');
	});

	it('falls back to Brave environment credentials without exposing them as stored', () => {
		process.env.BRAVE_API_KEY = ' environment-key ';
		expect(getSearchKey('brave')).toBe('environment-key');
		expect(getSearchSettings().configured.brave).toBe(false);
	});

	it('normalizes malformed persisted state', () => {
		setSearchProviders([
			{ id: 'brave', name: 'Brave', apiKey: 42, baseUrl: 'https://brave.test' },
		] as never);
		expect(getSearchSettings()).toEqual({
			engineId: 'brave',
			configured: { brave: false, tavily: false },
		});
	});
});

describe('search adapters', () => {
	it('calls Brave with its GET contract and normalizes results', async () => {
		(global.fetch as jest.Mock).mockResolvedValue(
			response({
				web: {
					results: [{ title: 'Brave result', url: 'https://brave.example', description: 'Text' }],
				},
			})
		);

		await expect(searchBrave({ query: 'friday', count: 3 }, 'brave-key')).resolves.toEqual({
			query: 'friday',
			results: [{ title: 'Brave result', url: 'https://brave.example', description: 'Text' }],
		});
		const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [URL, RequestInit];
		expect(url.toString()).toBe('https://api.search.brave.com/res/v1/web/search?q=friday&count=3');
		expect(init.headers).toEqual({
			Accept: 'application/json',
			'X-Subscription-Token': 'brave-key',
		});
	});

	it('calls Tavily with its POST contract and normalizes content', async () => {
		(global.fetch as jest.Mock).mockResolvedValue(
			response({
				results: [{ title: 'Tavily result', url: 'https://tavily.example', content: 'Text' }],
			})
		);

		await expect(searchTavily({ query: 'friday', count: 4 }, 'tavily-key')).resolves.toEqual({
			query: 'friday',
			results: [{ title: 'Tavily result', url: 'https://tavily.example', description: 'Text' }],
		});
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.tavily.com/search',
			expect.objectContaining({
				method: 'POST',
				headers: {
					Accept: 'application/json',
					Authorization: 'Bearer tavily-key',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: 'friday',
					max_results: 4,
					search_depth: 'basic',
					include_answer: false,
					include_raw_content: false,
				}),
			})
		);
	});

	it('reports provider failures without changing the normalized API', async () => {
		(global.fetch as jest.Mock).mockResolvedValue(response({}, 401, 'Unauthorized'));
		await expect(searchTavily({ query: 'friday', count: 5 }, 'bad-key')).rejects.toThrow(
			'Tavily search failed (401): Unauthorized'
		);
	});
});

describe('generic web search', () => {
	it('omits web_search when no search API key is stored', () => {
		process.env.BRAVE_API_KEY = 'environment-key';
		expect(getWebSearchTools()).toEqual([]);
	});

	it.each([
		['brave', 'brave-key'],
		['tavily', 'tavily-key'],
	] as const)('includes web_search when the %s API key is stored', (engineId, apiKey) => {
		saveSearchEngine(engineId, { apiKey });
		expect(getWebSearchTools().map((searchTool) => searchTool.name)).toEqual(['web_search']);
	});

	it('dispatches to the selected provider at execution time', async () => {
		saveSearchEngine('tavily', { apiKey: 'tavily-key' });
		(global.fetch as jest.Mock).mockResolvedValue(response({ results: [] }));

		await expect(searchWeb({ query: 'current events', count: 2 })).resolves.toEqual({
			query: 'current events',
			results: [],
		});
		expect(global.fetch).toHaveBeenCalledWith(
			'https://api.tavily.com/search',
			expect.objectContaining({ method: 'POST' })
		);
	});

	it('keeps the web_search tool output contract and default count', async () => {
		saveSearchEngine('brave', { apiKey: 'brave-key' });
		(global.fetch as jest.Mock).mockResolvedValue(response({ web: { results: [] } }));

		const [webSearchTool] = getWebSearchTools();
		const output = await webSearchTool.run({ query: 'friday' });
		expect(JSON.parse(output as string)).toEqual({ query: 'friday', results: [] });
		const [url] = (global.fetch as jest.Mock).mock.calls[0] as [URL];
		expect(url.searchParams.get('count')).toBe('5');
	});

	it('explains how to configure a missing selected provider', async () => {
		await expect(searchWeb({ query: 'friday' })).rejects.toThrow(
			'Configure Brave in Settings > Search engine'
		);
	});
});
