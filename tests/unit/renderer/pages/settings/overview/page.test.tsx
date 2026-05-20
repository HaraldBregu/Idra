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
	it('renders settings navigation rows in a grouped section', () => {
		renderOverviewPage();

		expect(screen.getByText('settings.overview.backToSettings')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.general/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.providers/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.agents/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.skills/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.connectors/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.channels/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.heartbeat/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.cron/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /settings\.tabs\.apps/ })).toBeInTheDocument();
	});

	it('navigates to the selected settings route when clicked', async () => {
		const user = userEvent.setup();
		renderOverviewPage();

		await user.click(screen.getByRole('button', { name: /settings\.tabs\.agents/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/agents');
	});
});
