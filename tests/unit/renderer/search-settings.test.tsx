import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from '../../../src/renderer/src/pages/settings/pages/search/Page';
import OverviewPage from '../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.providers': 'Providers',
		'settings.overview.descriptions.providers': 'API keys and providers',
		'settings.tabs.searchEngine': 'Search engine',
		'settings.searchEngine.description': 'Choose the web search provider.',
		'settings.searchEngine.defaultTitle': 'Default search engine',
		'settings.searchEngine.provider': 'Provider',
		'settings.searchEngine.defaultDescription': 'Used by the assistant for web searches.',
	};
	const t = (key: string, values?: Record<string, string>): string =>
		(translations[key] ?? key).replace('{{name}}', values?.name ?? '');
	return { useTranslation: () => ({ t }) };
});

const searchApi = {
	getSettings: jest.fn(),
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
	searchApi.selectEngine.mockResolvedValue({
		engineId: 'tavily',
		configured: { brave: true, tavily: true },
	});
});

describe('Search engine settings', () => {
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

	it('shows the Providers subtitle and keeps its upload action right aligned', () => {
		render(
			<MemoryRouter initialEntries={['/settings']}>
				<OverviewPage />
			</MemoryRouter>
		);

		const providersGroup = screen.getByText('Providers').closest('section');
		expect(providersGroup).not.toBeNull();
		expect(within(providersGroup as HTMLElement).getByText('API keys and providers')).toBeInTheDocument();
		expect(
			within(providersGroup as HTMLElement).getByRole('button', { name: 'Upload provider' })
		).toHaveClass('ml-auto');
	});
});
