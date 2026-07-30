import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from '../../../src/renderer/src/pages/settings/pages/search/Page';
import OverviewPage from '../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'common.cancel': 'Cancel',
		'common.save': 'Save',
		'settings.tabs.searchEngine': 'Search engine',
		'settings.searchEngine.description': 'Choose the web search provider.',
		'settings.searchEngine.defaultTitle': 'Default search engine',
		'settings.searchEngine.provider': 'Provider',
		'settings.searchEngine.defaultDescription': 'Used by the assistant for web searches.',
		'settings.searchEngine.engines': 'Search providers',
		'settings.searchEngine.braveDescription': 'Independent web search API.',
		'settings.searchEngine.tavilyDescription': 'Search API optimized for AI.',
		'settings.searchEngine.apiKeyPlaceholder': 'Paste API key',
		'settings.searchEngine.apiKeyLabel': '{{name}} API key',
		'settings.searchEngine.openSetup': 'Open {{name}} API setup',
		'settings.searchEngine.editKey': 'Edit {{name}} API key',
		'settings.searchEngine.active': 'Active',
		'settings.searchEngine.selected': 'Selected',
		'settings.searchEngine.connect': 'Connect',
		'settings.searchEngine.use': 'Use',
		'settings.searchEngine.localNote': 'Keys stay local.',
		'settings.searchEngine.braveName': 'Brave',
		'settings.searchEngine.tavilyName': 'Tavily',
	};
	const t = (key: string, values?: Record<string, string>): string =>
		(translations[key] ?? key).replace('{{name}}', values?.name ?? '');
	return { useTranslation: () => ({ t }) };
});

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
	it('shows the selected provider before it is configured', async () => {
		searchApi.getSettings.mockResolvedValue({
			engineId: 'brave',
			configured: { brave: false, tavily: false },
		});
		render(<SearchPage />);

		const brave = await screen.findByRole('heading', { name: 'Brave' });
		const braveCard = brave.closest('[data-slot="card"]');
		expect(braveCard).not.toBeNull();
		expect(within(braveCard as HTMLElement).getByText('Selected')).toBeInTheDocument();
		expect(within(braveCard as HTMLElement).getByRole('button', { name: 'Connect' })).toBeEnabled();
	});

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
		await waitFor(() => {
			const tavilyCard = screen
				.getByRole('heading', { name: 'Tavily' })
				.closest('[data-slot="card"]');
			expect(tavilyCard).not.toBeNull();
			expect(within(tavilyCard as HTMLElement).getByText('Active')).toBeInTheDocument();
		});
	});

	it('selects the default provider from the search engine control', async () => {
		const user = userEvent.setup();
		searchApi.getSettings.mockResolvedValue({
			engineId: 'brave',
			configured: { brave: true, tavily: true },
		});
		render(<SearchPage />);

		const selector = await screen.findByRole('combobox', { name: 'Default search engine' });
		selector.focus();
		await user.keyboard('{ArrowDown}');
		await user.click(await screen.findByRole('option', { name: 'Tavily' }));

		await waitFor(() => expect(searchApi.selectEngine).toHaveBeenCalledWith('tavily'));
		expect(screen.getByRole('combobox', { name: 'Default search engine' })).toHaveTextContent(
			'Tavily'
		);
	});
});

describe('Settings overview', () => {
	it('does not list model services', () => {
		render(
			<MemoryRouter initialEntries={['/settings']}>
				<OverviewPage />
			</MemoryRouter>
		);

		expect(screen.queryByText('settings.overview.groups.modelServices')).not.toBeInTheDocument();
		expect(
			screen.queryByText('settings.modelServices.speechTranscriberName')
		).not.toBeInTheDocument();
		expect(screen.queryByText('settings.tabs.database')).not.toBeInTheDocument();
		expect(screen.getByText('Search engine')).toBeInTheDocument();
		const assistantGroup = screen
			.getByText('settings.overview.groups.assistant')
			.closest('section');
		expect(assistantGroup).not.toBeNull();
		expect(within(assistantGroup as HTMLElement).getByText('settings.tabs.wiki')).toBeInTheDocument();
	});
});
