import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from '../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.searchEngine': 'Search engine',
	};
	const t = (key: string, values?: Record<string, string>): string =>
		(translations[key] ?? key).replace('{{name}}', values?.name ?? '');
	return { useTranslation: () => ({ t }) };
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
		expect(screen.queryByText('settings.rag.title')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.wiki.title')).not.toBeInTheDocument();
	});
});
