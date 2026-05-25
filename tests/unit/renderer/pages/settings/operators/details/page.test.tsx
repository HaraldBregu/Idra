import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import OperatorDetailsPage from '../../../../../../../src/renderer/src/pages/settings/pages/operators/details/Page';

const mockT = (key: string): string => key;

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: mockT,
	}),
}));

jest.mock('@/components/ui/select', () => {
	const Passthrough = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>;

	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => <span />,
	};
});

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderOperatorDetailsPage(path = '/settings/operators/friday/details'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/operators/:operatorId/details" element={<OperatorDetailsPage />} />
				<Route
					path="/settings/operators/:operatorId/details/chathistory"
					element={<div>Chat history route</div>}
				/>
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('OperatorDetailsPage', () => {
	beforeEach(() => {
		const provider = {
			id: 'openai',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
		};
		const model = { id: 'gpt-5', name: 'GPT-5' };
		const assistantOperator = {
			id: 'friday',
			name: 'Assistant',
			docsPath: 'models/large-language-model.md',
			status: 'implemented' as const,
			provider,
			model,
		};
		window.app = {
			...window.app,
			getModels: jest.fn(async () => [model]),
			getSpeechToTextModels: jest.fn(async () => [
				{ id: 'gpt-realtime-whisper', name: 'GPT Realtime Whisper' },
			]),
			getTextToSpeechModels: jest.fn(async () => [
				{ id: 'rachel-multilingual', name: 'Rachel - multilingual' },
			]),
			getImageCreatorModels: jest.fn(async () => [
				{ id: 'image-provider-coming-soon', name: 'Not available yet' },
			]),
			getTextToVideoModels: jest.fn(async () => [
				{ id: 'video-provider-coming-soon', name: 'Not available yet' },
			]),
			getMusicCreatorModels: jest.fn(async () => [
				{ id: 'music-provider-coming-soon', name: 'Not available yet' },
			]),
		};
		window.store = {
			...window.store,
			getProviders: jest.fn(async () => [provider]),
			getAssistantOperator: jest.fn(async () => assistantOperator),
			getSpeechToTextOperator: jest.fn(async () => undefined),
			getTextToSpeechOperator: jest.fn(async () => undefined),
			getImageCreatorOperator: jest.fn(async () => undefined),
			getTextToVideoOperator: jest.fn(async () => undefined),
			getMusicCreatorOperator: jest.fn(async () => undefined),
			saveAssistantOperator: jest.fn(async () => true),
			saveSpeechToTextOperator: jest.fn(async () => true),
			saveTextToSpeechOperator: jest.fn(async () => true),
			saveImageCreatorOperator: jest.fn(async () => true),
			saveTextToVideoOperator: jest.fn(async () => true),
			saveMusicCreatorOperator: jest.fn(async () => true),
		} as typeof window.store;
	});

	it('navigates from the Friday operator history row to chat history', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage();

		await user.click(await screen.findByRole('button', { name: /settings\.chatHistory\.title/ }));

		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/operators/friday/details/chathistory'
		);
	});

	it('renders the Friday page without identity or history description and collapses provider settings', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage();

		const providerCard = await screen.findByRole('button', {
			name: /settings\.operators\.provider/,
		});

		expect(screen.queryByText('settings.operators.identity')).not.toBeInTheDocument();
		expect(screen.queryByText('settings.chatHistory.description')).not.toBeInTheDocument();
		expect(providerCard).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText('settings.operators.providerDescription')).not.toBeInTheDocument();

		await user.click(providerCard);

		expect(providerCard).toHaveAttribute('aria-expanded', 'true');
		expect(await screen.findByText('settings.operators.providerDescription')).toBeInTheDocument();
	});

	it('renders configurable settings for the text-to-image operator', async () => {
		const user = userEvent.setup();
		renderOperatorDetailsPage('/settings/operators/image-assistant/details');

		const providerCard = await screen.findByRole('button', {
			name: /settings\.operators\.provider/,
		});
		expect(screen.queryByText('settings.operators.configurationPending')).not.toBeInTheDocument();

		await user.click(providerCard);

		expect(
			await screen.findByText('settings.operators.imageProviderDescription')
		).toBeInTheDocument();
		expect(window.store.getImageCreatorOperator).toHaveBeenCalled();
		expect(window.app.getImageCreatorModels).toHaveBeenCalled();
	});

	it.each([
		[
			'/settings/operators/text-to-speech/details',
			'settings.operators.textToSpeechProviderDescription',
			'settings.operators.textToSpeechModel',
			'settings.operators.textToSpeechModelDescription',
			'ElevenLabs',
			'Eleven v3',
			'getTextToSpeechOperator',
			'getTextToSpeechModels',
		],
		[
			'/settings/operators/text-to-video/details',
			'settings.operators.videoProviderDescription',
			'settings.operators.videoModel',
			'settings.operators.videoModelDescription',
			'Video provider',
			'Veo 3.1',
			'getTextToVideoOperator',
			'getTextToVideoModels',
		],
		[
			'/settings/operators/music-creator/details',
			'settings.operators.musicProviderDescription',
			'settings.operators.musicModel',
			'settings.operators.musicModelDescription',
			'Music provider',
			'Lyria 3 Pro Preview',
			'getMusicCreatorOperator',
			'getMusicCreatorModels',
		],
	])(
		'renders read-only pending settings for %s',
		async (
			path,
			providerDescription,
			modelLabel,
			modelDescription,
			providerName,
			modelName,
			operatorMethod,
			modelsMethod
		) => {
			renderOperatorDetailsPage(path);

			expect(await screen.findByText('settings.operators.configurationPending')).toBeInTheDocument();
			expect(screen.getByText(providerDescription)).toBeInTheDocument();
			expect(screen.getByText(modelLabel)).toBeInTheDocument();
			expect(screen.getByText(modelDescription)).toBeInTheDocument();
			expect(screen.getByText(providerName)).toBeInTheDocument();
			expect(screen.getByText(modelName)).toBeInTheDocument();
			expect((window.store as unknown as Record<string, jest.Mock>)[operatorMethod]).not.toHaveBeenCalled();
			expect((window.app as unknown as Record<string, jest.Mock>)[modelsMethod]).not.toHaveBeenCalled();
		}
	);

	it.each([
		'/settings/operators/cron-task-scheduler/details',
		'/settings/operators/background-task/details',
		'/settings/operators/document-reader/details',
	])('does not render removed workflow operator details for %s', async (path) => {
		renderOperatorDetailsPage(path);

		expect(await screen.findByText('settings.operators.notFoundTitle')).toBeInTheDocument();
		expect(screen.getByText('settings.operators.notFoundDescription')).toBeInTheDocument();
	});
});
