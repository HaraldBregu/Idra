import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StartPage from '../../../../../src/renderer/src/pages/start/StartPage';
import type { PublicProvider } from '../../../../../src/shared/providers';
import type { Model } from '../../../../../src/shared/service';

jest.mock('@/components/ui/dome-wave-animation', () => ({
	DomeWaveAnimation: () => <div data-testid="dome-wave" />,
}));

jest.mock('@/components/ui/provider-avatar', () => ({
	ProviderAvatar: ({ name }: { readonly name: string }) => <span aria-hidden="true">{name}</span>,
}));

const openAiProvider: PublicProvider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
	capabilities: 'Chat',
};

const assistantModel: Model = {
	id: 'gpt-5.4-mini',
	name: 'GPT-5.4 Mini',
};
const speechModel: Model = {
	id: 'gpt-4o-transcribe',
	name: 'GPT-4o Transcribe',
};
const textToSpeechModel: Model = {
	id: 'gpt-4o-mini-tts',
	name: 'GPT-4o Mini TTS',
};
const imageModel: Model = {
	id: 'gpt-image-2',
	name: 'GPT Image 2',
};
const videoModel: Model = {
	id: 'sora-2',
	name: 'Sora 2',
};
const audioModel: Model = {
	id: 'audio-model',
	name: 'Audio Model',
};

function installAppApi(): void {
	window.app = {
		getSpeechToTextModels: jest.fn(async () => [speechModel]),
		getTextToSpeechModels: jest.fn(async () => [textToSpeechModel]),
		getImageCreatorModels: jest.fn(async () => [imageModel]),
		getTextToVideoModels: jest.fn(async () => [videoModel]),
		getMusicCreatorModels: jest.fn(async () => [audioModel]),
		getModels: jest.fn(async () => [assistantModel]),
		openExternalUrl: jest.fn(async () => undefined),
	} as unknown as typeof window.app;
	window.store = {
		isProviderApiKeySaved: jest.fn(async (providerId: string) => providerId === 'openai'),
		setProviderApiKey: jest.fn(async () => undefined),
		getProviders: jest.fn(async () => [openAiProvider]),
		getAssistantOperator: jest.fn(async () => undefined),
		saveAssistantOperator: jest.fn(async () => true),
		getSpeechToTextOperator: jest.fn(async () => undefined),
		saveSpeechToTextOperator: jest.fn(async () => true),
		getTextToSpeechOperator: jest.fn(async () => undefined),
		saveTextToSpeechOperator: jest.fn(async () => true),
		getImageCreatorOperator: jest.fn(async () => undefined),
		saveImageCreatorOperator: jest.fn(async () => true),
		getTextToVideoOperator: jest.fn(async () => undefined),
		saveTextToVideoOperator: jest.fn(async () => true),
		getMusicCreatorOperator: jest.fn(async () => undefined),
		saveMusicCreatorOperator: jest.fn(async () => true),
	} as unknown as typeof window.store;
}

function renderStartPage(): void {
	render(
		<MemoryRouter>
			<StartPage />
		</MemoryRouter>
	);
}

describe('StartPage', () => {
	beforeEach(() => {
		installAppApi();
	});

	it('labels the final setup step as Configure models', async () => {
		const user = userEvent.setup();
		renderStartPage();

		await user.click(screen.getByRole('button', { name: /Get started/ }));
		const continueButton = screen.getByRole('button', { name: /Continue/ });

		await waitFor(() => {
			expect(continueButton).toBeEnabled();
		});
		await user.click(continueButton);

		expect(await screen.findByRole('heading', { name: 'Configure models' })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: 'Configure operators' })).not.toBeInTheDocument();
		expect(screen.getAllByText('Configure models').length).toBeGreaterThan(0);
	});

	it('shows every documented model area in the model configuration step', async () => {
		const user = userEvent.setup();
		renderStartPage();

		await user.click(screen.getByRole('button', { name: /Get started/ }));
		const continueButton = screen.getByRole('button', { name: /Continue/ });

		await waitFor(() => {
			expect(continueButton).toBeEnabled();
		});
		await user.click(continueButton);

		expect(await screen.findByText('Friday Assistant')).toBeInTheDocument();
		expect(screen.getByText('Voice Input')).toBeInTheDocument();
		expect(screen.getByText('Voice Output')).toBeInTheDocument();
		expect(screen.getByText('Text to Image')).toBeInTheDocument();
		expect(screen.getByText('Text to Video')).toBeInTheDocument();
		expect(screen.getByText('Text to Audio')).toBeInTheDocument();
		expect(screen.getByText('OCR')).toBeInTheDocument();
		expect(screen.getByText('Embedding')).toBeInTheDocument();
	});

	it('saves provider and model selections for every configurable model area', async () => {
		const user = userEvent.setup();
		renderStartPage();

		await user.click(screen.getByRole('button', { name: /Get started/ }));
		const providerContinueButton = screen.getByRole('button', { name: /Continue/ });

		await waitFor(() => {
			expect(providerContinueButton).toBeEnabled();
		});
		await user.click(providerContinueButton);

		expect(await screen.findByRole('heading', { name: 'Configure models' })).toBeInTheDocument();
		const modelContinueButton = screen.getByRole('button', { name: /Continue/ });

		await waitFor(() => {
			expect(modelContinueButton).toBeEnabled();
		});
		await user.click(modelContinueButton);

		await waitFor(() => {
			expect(window.store.saveAssistantOperator).toHaveBeenCalledWith(openAiProvider, assistantModel);
			expect(window.store.saveSpeechToTextOperator).toHaveBeenCalledWith(
				openAiProvider,
				speechModel
			);
			expect(window.store.saveTextToSpeechOperator).toHaveBeenCalledWith(
				openAiProvider,
				textToSpeechModel
			);
			expect(window.store.saveImageCreatorOperator).toHaveBeenCalledWith(
				openAiProvider,
				imageModel
			);
			expect(window.store.saveTextToVideoOperator).toHaveBeenCalledWith(openAiProvider, videoModel);
			expect(window.store.saveMusicCreatorOperator).toHaveBeenCalledWith(openAiProvider, audioModel);
		});
	});

	it('keeps saved provider keys masked outside the edit draft', async () => {
		const user = userEvent.setup();
		renderStartPage();

		await user.click(screen.getByRole('button', { name: /Get started/ }));

		expect(await screen.findByText('sk-************')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Edit OpenAI API key' }));

		const apiKeyInput = screen.getByLabelText('OpenAI API key');
		expect(apiKeyInput).toHaveAttribute('type', 'password');
		expect(apiKeyInput).toHaveValue('');
		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

		await user.type(apiKeyInput, 'new-api-key');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => {
			expect(window.store.setProviderApiKey).toHaveBeenCalledWith('openai', 'new-api-key');
		});
		expect(await screen.findByText('sk-************')).toBeInTheDocument();
	});
});
