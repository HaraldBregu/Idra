import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OverviewPage from '../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string): string => key }),
}));

it('lists MCP once under the assistant group', () => {
	render(
		<MemoryRouter initialEntries={['/settings']}>
			<OverviewPage />
		</MemoryRouter>
	);

	const assistantGroup = screen.getByText('settings.overview.groups.assistant').closest('section');
	expect(assistantGroup).not.toBeNull();
	expect(within(assistantGroup as HTMLElement).getByText('settings.tabs.mcp')).toBeInTheDocument();
	expect(screen.getAllByText('settings.tabs.mcp')).toHaveLength(1);
});

it('uses the assistant title UI for the providers title', () => {
	render(
		<MemoryRouter initialEntries={['/settings']}>
			<OverviewPage />
		</MemoryRouter>
	);

	const assistantTitle = screen.getByRole('heading', {
		name: 'settings.overview.groups.assistant',
	});
	const providersTitle = screen.getByRole('heading', { name: 'settings.tabs.providers' });
	expect(providersTitle.tagName).toBe(assistantTitle.tagName);
	expect(providersTitle.className).toBe(assistantTitle.className);
});

it('lists Channels once outside the providers group', () => {
	render(
		<MemoryRouter initialEntries={['/settings']}>
			<OverviewPage />
		</MemoryRouter>
	);

	const providersGroup = screen.getByText('settings.tabs.providers').closest('section');
	expect(providersGroup).not.toBeNull();
	expect(within(providersGroup as HTMLElement).queryByText('settings.tabs.channels')).toBeNull();
	const channelsGroup = screen.getByText('settings.tabs.channels').closest('section');
	expect(channelsGroup).not.toBeNull();
	expect(within(channelsGroup as HTMLElement).getAllByRole('button')).toHaveLength(1);
	expect(screen.getAllByText('settings.tabs.channels')).toHaveLength(1);
});
