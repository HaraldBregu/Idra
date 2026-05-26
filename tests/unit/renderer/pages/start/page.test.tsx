import React from 'react';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import StartPage from '../../../../../src/renderer/src/pages/start/StartPage';
import type { PublicProvider } from '../../../../../src/shared/providers';
import type { Model } from '../../../../../src/shared/service';

jest.mock('@/components/ui/dome-wave-animation', () => ({
	DomeWaveAnimation: () => <div data-testid="dome-wave" />,
}));

jest.mock('@/components/ui/provider-avatar', () => ({
	ProviderAvatar: ({ name }: { readonly name: string }) => <span aria-hidden="true">{name}</span>,
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
	SelectTrigger: ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>,
	SelectValue: ({ children }: { readonly children?: ReactNode }) => <span>{children}</span>,
	SelectContent: ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children, value }: { readonly children?: ReactNode; readonly value?: string }) => (
		<div data-value={value}>{children}</div>
	),
}));

jest.mock('@/components/ui/tooltip', () => ({
	Tooltip: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
	TooltipContent: () => null,
	TooltipProvider: ({ children }: { readonly children?: ReactNode }) => <>{children}</>,
	TooltipTrigger: ({
		children,
		render: renderProp,
	}: {
		readonly children?: ReactNode;
		readonly render?: React.ReactElement;
	}) => (renderProp !== undefined ? renderProp : <>{children}</>),
}));

const openAiProvider: PublicProvider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
	capabilities: 'Chat',
};

const anthropicProvider: PublicProvider = {
	id: 'anthropic',
	name: 'Anthropic',
	baseUrl: 'https://api.anthropic.com/v1',
	capabilities: 'Chat',
};

const assistantModel: Model = { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' };
const speechModel: Model = { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe' };
const textToSpeechModel: Model = { id: 'gpt-4o-mini-tts', name: 'GPT-4o Mini TTS' };
const imageModel: Model = { id: 'gpt-image-2', name: 'GPT Image 2' };
const videoModel: Model = { id: 'sora-2', name: 'Sora 2' };
const audioModel: Model = { id: 'audio-model', name: 'Audio Model' };

function installAppApi(): void {
	window.app = {
		getModels: jest.fn(async () => [assistantModel]),
		getSpeechToTextModels: jest.fn(async () => [speechModel]),
		getTextToSpeechModels: jest.fn(async () => [textToSpeechModel]),
		getImageCreatorModels: jest.fn(async () => [imageModel]),
		getTextToVideoModels: jest.fn(async () => [videoModel]),
		getMusicCreatorModels: jest.fn(async () => [audioModel]),
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

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderStartPage(): void {
	render(
		<MemoryRouter>
			<StartPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('StartPage', () => {
	let consoleErrorSpy: jest.SpyInstance;
	let consoleWarnSpy: jest.SpyInstance;

	beforeEach(() => {
		installAppApi();
		consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
	});

	describe('presentation step', () => {
		it('renders the welcome heading and animation', () => {
			renderStartPage();
			expect(screen.getByRole('heading', { name: 'Welcome to Friday' })).toBeInTheDocument();
			expect(screen.getByTestId('dome-wave')).toBeInTheDocument();
		});

		it('shows Get started as the primary button label', () => {
			renderStartPage();
			expect(screen.getByRole('button', { name: /Get started/ })).toBeInTheDocument();
		});

		it('does not show a Back button on the presentation step', () => {
			renderStartPage();
			expect(screen.queryByRole('button', { name: /Back/ })).not.toBeInTheDocument();
		});
	});

	describe('skip navigation', () => {
		it('navigates to /home when Skip is clicked', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Skip/ }));
			expect(screen.getByTestId('location')).toHaveTextContent('/home');
		});
	});

	describe('providers step', () => {
		it('advances to the providers step when Get started is clicked', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			expect(await screen.findByRole('heading', { name: 'Connect a provider' })).toBeInTheDocument();
		});

		it('shows a Back button on the providers step', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			expect(await screen.findByRole('button', { name: /Back/ })).toBeInTheDocument();
		});

		it('returns to the presentation step when Back is clicked', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await user.click(await screen.findByRole('button', { name: /Back/ }));
			expect(await screen.findByRole('heading', { name: 'Welcome to Friday' })).toBeInTheDocument();
		});

		it('checks saved provider status for all providers when entering the step', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => {
				expect(window.store.isProviderApiKeySaved).toHaveBeenCalledWith('openai');
				expect(window.store.isProviderApiKeySaved).toHaveBeenCalledWith('anthropic');
			});
			expect((window.store.isProviderApiKeySaved as jest.Mock).mock.calls.length).toBeGreaterThan(2);
		});

		it('shows the masked key label for already-saved providers', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			expect(await screen.findByText('sk-************')).toBeInTheDocument();
		});

		it('enables the Continue button when a provider has a saved key', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => {
				expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled();
			});
		});

		it('disables Continue when no provider has a saved key or draft', async () => {
			window.store.isProviderApiKeySaved = jest.fn().mockResolvedValue(false);
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => {
				expect(window.store.isProviderApiKeySaved).toHaveBeenCalled();
			});
			expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
		});
	});

	describe('provider API key flow', () => {
		it('shows the API key input when Connect is clicked for an unsaved provider', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => expect(window.store.isProviderApiKeySaved).toHaveBeenCalled());
			const [firstConnect] = screen.getAllByRole('button', { name: 'Connect' });
			await user.click(firstConnect);
			expect(screen.getByPlaceholderText('Paste your API key')).toBeInTheDocument();
		});

		it('saves the API key and shows the masked label after a successful save', async () => {
			window.store.isProviderApiKeySaved = jest.fn().mockResolvedValue(false);
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			const apiKeyInput = await screen.findByLabelText('OpenAI API key');
			await user.type(apiKeyInput, 'sk-test-key');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			await waitFor(() => {
				expect(window.store.setProviderApiKey).toHaveBeenCalledWith('openai', 'sk-test-key');
			});
			expect(await screen.findByText('sk-************')).toBeInTheDocument();
		});

		it('shows an error and logs when saving an API key fails', async () => {
			window.store.isProviderApiKeySaved = jest.fn().mockResolvedValue(false);
			window.store.setProviderApiKey = jest.fn().mockRejectedValue(new Error('Connection refused'));
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			const apiKeyInput = await screen.findByLabelText('OpenAI API key');
			await user.type(apiKeyInput, 'bad-key');
			await user.click(screen.getByRole('button', { name: 'Save' }));
			expect(await screen.findByText('Connection refused')).toBeInTheDocument();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[useProviderSetup] Failed to save API key:',
				expect.any(Error)
			);
		});

		it('shows an error and logs when the saved-status check fails', async () => {
			window.store.isProviderApiKeySaved = jest.fn().mockRejectedValue(new Error('Store unavailable'));
			const user = userEvent.setup();
			renderStartPage();
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			expect(await screen.findByText('Store unavailable')).toBeInTheDocument();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[useProviderSetup] Failed to check saved provider status:',
				expect.any(Error)
			);
		});
	});

	describe('model service steps', () => {
		async function advanceToAssistantStep(user: ReturnType<typeof userEvent.setup>): Promise<void> {
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled());
			await user.click(screen.getByRole('button', { name: /Continue/ }));
		}

		it('advances to the AI assistant step after clicking Continue on providers', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			expect(await screen.findByRole('heading', { name: 'AI assistant' })).toBeInTheDocument();
		});

		it('shows the Required badge on the assistant step', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			expect(await screen.findByText('Required')).toBeInTheDocument();
		});

		it('loads models from connected providers when entering a model service step', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => {
				expect(window.app.getModels).toHaveBeenCalledWith(openAiProvider);
			});
		});

		it('pre-selects the provider and model matching a stored operator', async () => {
			window.store.getAssistantOperator = jest.fn().mockResolvedValue({
				provider: openAiProvider,
				model: assistantModel,
			});
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled());
			expect(screen.getByText('OpenAI')).toBeInTheDocument();
			expect(screen.getByText('GPT-5.4 Mini')).toBeInTheDocument();
		});

		it('enables Continue on a required step only after models are loaded', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => {
				expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled();
			});
		});

		it('saves the assistant operator when Continue is clicked', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled());
			await user.click(screen.getByRole('button', { name: /Continue/ }));
			await waitFor(() => {
				expect(window.store.saveAssistantOperator).toHaveBeenCalledWith(
					openAiProvider,
					assistantModel
				);
			});
		});

		it('shows an error and logs when the operator save fails', async () => {
			window.store.saveAssistantOperator = jest.fn().mockRejectedValue(new Error('Save failed'));
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled());
			await user.click(screen.getByRole('button', { name: /Continue/ }));
			expect(await screen.findByText('Save failed')).toBeInTheDocument();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'[useModelServices] Failed to save operator config:',
				expect.any(Error)
			);
		});

		it('shows an error but keeps the step accessible when a provider model fetch fails', async () => {
			window.store.getProviders = jest.fn().mockResolvedValue([openAiProvider, anthropicProvider]);
			let callCount = 0;
			window.app.getModels = jest.fn().mockImplementation(() => {
				callCount++;
				return callCount % 2 === 0
					? Promise.reject(new Error('timeout'))
					: Promise.resolve([assistantModel]);
			});
			const user = userEvent.setup();
			renderStartPage();
			await advanceToAssistantStep(user);
			await waitFor(() => {
				expect(screen.getByText('timeout')).toBeInTheDocument();
				expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled();
			});
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'[useModelServices] Failed to load models for provider:',
				'anthropic',
				expect.any(Error)
			);
		});
	});

	describe('primary button labels', () => {
		async function navigateToModelStep(user: ReturnType<typeof userEvent.setup>): Promise<void> {
			await user.click(screen.getByRole('button', { name: /Get started/ }));
			await waitFor(() => expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled());
			await user.click(screen.getByRole('button', { name: /Continue/ }));
		}

		it('shows Continue on intermediate model service steps', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await navigateToModelStep(user);
			expect(await screen.findByRole('button', { name: /Continue/ })).toBeInTheDocument();
		});

		it('shows Get started on the last model service step', async () => {
			const user = userEvent.setup();
			renderStartPage();
			await navigateToModelStep(user);
			// Advance through 5 remaining Continue steps to reach the last (music generation)
			for (let i = 0; i < 5; i++) {
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled()
				);
				await user.click(screen.getByRole('button', { name: /Continue/ }));
			}
			expect(await screen.findByRole('heading', { name: 'Music generation' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: /Get started/ })).toBeInTheDocument();
		});
	});

	describe('complete flow', () => {
		it('navigates to /home after completing all model service steps', async () => {
			const user = userEvent.setup();
			renderStartPage();

			// presentation → providers
			await user.click(screen.getByRole('button', { name: /Get started/ }));

			// providers → assistant
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled()
			);
			await user.click(screen.getByRole('button', { name: /Continue/ }));

			// assistant through text-to-video: 5 Continue clicks
			for (let i = 0; i < 5; i++) {
				await waitFor(() =>
					expect(screen.getByRole('button', { name: /Continue/ })).toBeEnabled()
				);
				await user.click(screen.getByRole('button', { name: /Continue/ }));
			}

			// music-creator: Get started → /home
			await waitFor(() =>
				expect(screen.getByRole('button', { name: /Get started/ })).toBeEnabled()
			);
			await user.click(screen.getByRole('button', { name: /Get started/ }));

			await waitFor(() => {
				expect(screen.getByTestId('location')).toHaveTextContent('/home');
			});
		});
	});
});
