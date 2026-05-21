import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import OverviewPage from '../../../../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderOverviewPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings']}>
			<OverviewPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('OverviewPage', () => {
	it('renders settings navigation rows in grouped sections', () => {
		renderOverviewPage();

		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.general',
		})).toBeInTheDocument();
		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.capabilities',
		})).toBeInTheDocument();
		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.automation',
		})).toBeInTheDocument();

		expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
			'settings.tabs.general',
			'settings.tabs.providers',
			'settings.tabs.channels',
			'settings.tabs.operators',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.tabs.heartbeat',
			'settings.tabs.cron',
			'settings.tabs.taskManager',
			'settings.tabs.apps',
		]);
	});

	it('navigates to the selected settings route when clicked', async () => {
		const user = userEvent.setup();
		renderOverviewPage();

		await user.click(screen.getByRole('button', { name: /settings\.tabs\.agents/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/operators');
	});
});
