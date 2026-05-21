import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import OperatorsPage from '../../../../../../src/renderer/src/pages/settings/pages/operators/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderOperatorsPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/operators']}>
			<OperatorsPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('OperatorsPage', () => {
	it('renders the Friday operator without a default badge', () => {
		renderOperatorsPage();

		expect(screen.getByText('settings.operators.fridayName')).toBeInTheDocument();
		expect(screen.queryByText('settings.operators.defaultOperator')).not.toBeInTheDocument();
	});

	it('renders speech, image, video, music, document, cron, and background operators', () => {
		renderOperatorsPage();

		expect(screen.getByText('settings.operators.speechTranscriberName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.textToSpeechName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.imageAssistantName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.videoCreatorName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.musicCreatorName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.documentReaderName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.cronTaskName')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.backgroundTaskName')).toBeInTheDocument();
	});

	it('does not render operator descriptions in the list', () => {
		renderOperatorsPage();

		expect(screen.queryByText('settings.operators.fridayDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.speechTranscriberDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.textToSpeechDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.imageAssistantDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.videoCreatorDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.musicCreatorDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.documentReaderDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.cronTaskDescription')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.operators.backgroundTaskDescription')).not.toBeInTheDocument();
	});

	it('navigates to the Friday operator details route when clicked', async () => {
		const user = userEvent.setup();
		renderOperatorsPage();

		await user.click(screen.getByRole('button', { name: /settings\.operators\.fridayName/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/operators/friday/details');
	});

	it('navigates to the Speech to Text operator details route when clicked', async () => {
		const user = userEvent.setup();
		renderOperatorsPage();

		await user.click(screen.getByRole('button', {
			name: /settings\.operators\.speechTranscriberName/,
		}));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/operators/speech-to-text/details'
		);
	});

	it('navigates to the Cron Task operator details route when clicked', async () => {
		const user = userEvent.setup();
		renderOperatorsPage();

		await user.click(screen.getByRole('button', {
			name: /settings\.operators\.cronTaskName/,
		}));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/operators/cron-task-scheduler/details'
		);
	});
});
