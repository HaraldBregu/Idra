import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from '../../../src/renderer/src/pages/settings/pages/search/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.application': 'Application',
		'settings.application.information': 'Information',
		'settings.application.actions': 'Actions',
		'settings.application.search': 'Search',
		'settings.application.name': 'Name',
		'settings.application.version': 'Version',
		'settings.application.menuBar': 'Menu Bar',
		'settings.application.keepAwake': 'Keep Computer Active',
		'settings.application.appData': 'Application Data',
		'settings.application.openAppData': 'Open Folder',
		'settings.sections.layout': 'Layout',
		'settings.language.title': 'Language',
		'settings.language.en': 'English',
		'settings.theme.title': 'Theme',
		'settings.theme.system': 'System',
		'settings.searchEngine.defaultTitle': 'Default search engine',
		'settings.searchEngine.defaultDescription': 'Used by the assistant for web searches.',
	};
	return { useTranslation: () => ({ t: (key: string) => translations[key] ?? key }) };
});

jest.mock('@/contexts', () => ({
	useApp: () => ({
		language: 'en',
		setLanguage: jest.fn(),
		theme: 'system',
		setTheme: jest.fn(),
	}),
}));

const searchApi = {
	getSettings: jest.fn(),
	selectEngine: jest.fn(),
};

beforeAll(() => {
	Object.defineProperty(globalThis, '__APP_NAME__', { configurable: true, value: 'Friday' });
	Object.defineProperty(globalThis, '__APP_VERSION__', { configurable: true, value: '1.0.0' });
});

beforeEach(() => {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: {
			getTrayEnabled: jest.fn().mockResolvedValue(true),
			getKeepAwake: jest.fn().mockResolvedValue(false),
		},
	});
	Object.defineProperty(window, 'search', { configurable: true, value: searchApi });
	searchApi.getSettings.mockResolvedValue({
		engineId: 'brave',
		configured: { brave: true, tavily: true },
	});
	searchApi.selectEngine.mockResolvedValue({
		engineId: 'tavily',
		configured: { brave: true, tavily: true },
	});
});

it('selects the default search provider from search settings', async () => {
	const user = userEvent.setup();
	render(<SearchPage />);

	await user.click(await screen.findByRole('button', { name: /Brave/ }));
	const selector = await screen.findByRole('combobox', { name: 'Default search engine' });
	await user.click(selector);
	await user.click(await screen.findByRole('option', { name: 'Tavily' }));

	await waitFor(() => expect(searchApi.selectEngine).toHaveBeenCalledWith('tavily'));
});
