import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import OverviewPage from '../../../../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			if (key === 'settings.operators.assistantName') return 'AI Assistant';
			return key;
		},
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
			name: 'settings.overview.groups.app',
		})).toBeInTheDocument();
		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.ai',
		})).toBeInTheDocument();
		const monitoringSection = screen.getByRole('heading', {
			name: 'settings.overview.groups.monitoring',
		}).closest('section');
		expect(monitoringSection).not.toBeNull();

		expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
			'settings.tabs.general',
			'settings.tabs.system',
			'AI Assistant',
			'settings.operators.speechTranscriberName',
			'settings.operators.textToSpeechNameSoon',
			'settings.operators.imageAssistantName',
			'settings.operators.videoCreatorNameSoon',
			'settings.operators.musicCreatorNameSoon',
			'settings.tabs.providers',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.tabs.channels',
			'settings.tabs.heartbeat',
			'settings.sections.taskScheduler',
			'settings.tabs.backgroundTasks',
			'settings.tabs.monitoring',
			'settings.tabs.policies',
		]);
		expect(within(monitoringSection as HTMLElement).getAllByRole('button').map((button) => button.textContent)).toEqual([
			'settings.tabs.backgroundTasks',
			'settings.tabs.monitoring',
			'settings.tabs.policies',
		]);

		expect(screen.getAllByRole('button').at(-1)).toHaveTextContent('settings.tabs.policies');
	});

	it('navigates to the selected settings route when clicked', async () => {
		const user = userEvent.setup();
		renderOverviewPage();

		await user.click(screen.getByRole('button', { name: 'AI Assistant' }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/operators/friday/details');
	});
});
