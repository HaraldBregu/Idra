import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from '../../../src/renderer/src/pages/settings/pages/search/Page';
import OverviewPage from '../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, values?: Record<string, string>) => {
			const translations: Record<string, string> = {
				'common.cancel': 'Cancel',
				'common.save': 'Save',
				'settings.tabs.searchEngine': 'Search engine',
				'settings.searchEngine.description': 'Choose the web search provider.',
				'settings.searchEngine.engines': 'Search providers',
				'settings.searchEngine.braveDescription': 'Independent web search API.',
				'settings.searchEngine.tavilyDescription': 'Search API optimized for AI.',
				'settings.searchEngine.apiKeyPlaceholder': 'Paste API key',
				'settings.searchEngine.apiKeyLabel': '{{name}} API key',
				'settings.searchEngine.openSetup': 'Open {{name}} API setup',
				'settings.searchEngine.editKey': 'Edit {{name}} API key',
				'settings.searchEngine.active': 'Active',
				'settings.searchEngine.connect': 'Connect',
				'settings.searchEngine.use': 'Use',
				'settings.searchEngine.localNote': 'Keys stay local.',
				'settings.searchEngine.braveName': 'Brave',
				'settings.searchEngine.tavilyName': 'Tavily',
			};
			return (translations[key] ?? key).replace('{{name}}', values?.name ?? '');
		},
	}),
}));

jest.mock('@/components/provider-avatar', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	return {
		ProviderAvatar: ({ name }: { name: string }) =>
			React.createElement('span', { 'aria-hidden': true }, name.slice(0, 1)),
	};
});

const searchApi = {
	getSettings: jest.fn(),
	saveEngine: jest.fn(),
	selectEngine: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'search', {
		configurable: true,
		value: searchApi,
	});
	searchApi.getSettings.mockResolvedValue({
		engineId: 'brave',
		configured: { brave: true, tavily: false },
	});
	searchApi.saveEngine.mockResolvedValue({
		engineId: 'brave',
		configured: { brave: true, tavily: true },
	});
	searchApi.selectEngine.mockResolvedValue({
		engineId: 'tavily',
		configured: { brave: true, tavily: true },
	});
});

describe('Search engine settings', () => {
	it('lists Brave and Tavily, marks the selected provider, and saves a provider key', async () => {
		const user = userEvent.setup();
		render(<SearchPage />);

		const brave = await screen.findByRole('heading', { name: 'Brave' });
		const braveCard = brave.closest('[data-slot="card"]');
		expect(braveCard).not.toBeNull();
		expect(within(braveCard as HTMLElement).getByText('Active')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Tavily' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Connect' }));
		await user.type(screen.getByLabelText('Tavily API key'), 'tvly-key');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => {
			expect(searchApi.saveEngine).toHaveBeenCalledWith('tavily', { apiKey: 'tvly-key' });
		});
	});

	it('switches the active provider from the provider list', async () => {
		const user = userEvent.setup();
		searchApi.getSettings.mockResolvedValue({
			engineId: 'brave',
			configured: { brave: true, tavily: true },
		});
		render(<SearchPage />);

		await user.click(await screen.findByRole('button', { name: 'Use' }));
		await waitFor(() => expect(searchApi.selectEngine).toHaveBeenCalledWith('tavily'));
		const tavilyCard = screen.getByRole('heading', { name: 'Tavily' }).closest('[data-slot="card"]');
		expect(tavilyCard).not.toBeNull();
		expect(within(tavilyCard as HTMLElement).getByText('Active')).toBeInTheDocument();
	});
});

describe('Settings overview', () => {
	it('shows only the selected search provider on the Search engine item', async () => {
		searchApi.getSettings.mockResolvedValue({
			engineId: 'tavily',
			configured: { brave: true, tavily: true },
		});
		render(
			<MemoryRouter initialEntries={['/settings']}>
				<OverviewPage />
			</MemoryRouter>
		);

		expect(await screen.findByText('Tavily')).toBeInTheDocument();
		expect(screen.queryByText('Brave')).not.toBeInTheDocument();
	});
});
