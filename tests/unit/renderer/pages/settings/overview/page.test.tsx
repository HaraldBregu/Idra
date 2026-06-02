import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import OverviewPage from '../../../../../../src/renderer/src/pages/settings/pages/overview/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			if (key === 'settings.modelServices.assistantName') return 'Agent';
			return key;
		},
	}),
}));

beforeEach(() => {
	Object.defineProperty(window, 'heartbeat', {
		configurable: true,
		value: {
			status: jest.fn(() => new Promise(() => undefined)),
			onEvent: jest.fn(() => jest.fn()),
		},
	});
});

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

function buttonTitles(container: HTMLElement = document.body): Array<string | null> {
	return within(container).getAllByRole('button').map((button) => (
		button.querySelector('[data-slot="item-title"]')?.textContent ?? null
	));
}

describe('OverviewPage', () => {
	it('renders settings navigation rows in grouped sections', () => {
		renderOverviewPage();

		expect(screen.queryByRole('heading', {
			name: 'settings.overview.groups.app',
		})).not.toBeInTheDocument();
		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.agent',
		})).toBeInTheDocument();
		expect(screen.getByRole('heading', {
			name: 'settings.overview.groups.modelServices',
		})).toBeInTheDocument();
		expect(screen.queryByRole('heading', {
			name: 'settings.overview.groups.monitoring',
		})).not.toBeInTheDocument();

		expect(buttonTitles()).toEqual([
			'settings.tabs.general',
			'settings.tabs.system',
			'settings.tabs.providers',
			'Agent',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.modelServices.speechTranscriberName',
			'settings.modelServices.textToSpeechName',
			'settings.modelServices.imageAssistantName',
			'settings.modelServices.videoCreatorName',
			'settings.modelServices.musicCreatorName',
			'settings.tabs.channels',
			'settings.tabs.heartbeat',
			'settings.sections.taskScheduler',
		]);
	});

	it('navigates to the selected settings route when clicked', async () => {
		const user = userEvent.setup();
		renderOverviewPage();

		await user.click(screen.getByRole('button', { name: /Agent/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/model-services/assistant/details');
	});
});
