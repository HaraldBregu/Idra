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
