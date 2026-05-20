import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AgentsPage from '../../../../../../src/renderer/src/pages/settings/pages/agents/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderAgentsPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/agents']}>
			<AgentsPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('AgentsPage', () => {
	it('renders the default Friday agent', () => {
		renderAgentsPage();

		expect(screen.getByText('settings.agents.fridayName')).toBeInTheDocument();
		expect(screen.getByText('settings.agents.defaultAgent')).toBeInTheDocument();
	});

	it('navigates to the Friday agent details route when clicked', async () => {
		const user = userEvent.setup();
		renderAgentsPage();

		await user.click(screen.getByRole('button', { name: /settings\.agents\.fridayName/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/agents/friday/details');
	});
});
