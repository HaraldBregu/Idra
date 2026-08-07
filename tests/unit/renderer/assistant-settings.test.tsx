import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssistantPage from '../../../src/renderer/src/pages/settings/pages/assistant/Page';

const mockProviders = [
	{ id: 'openai', name: 'OpenAI', baseUrl: 'https://openai.example' },
	{ id: 'google', name: 'Google', baseUrl: 'https://google.example' },
	{ id: 'elevenlabs', name: 'ElevenLabs', baseUrl: 'https://elevenlabs.example' },
];
const mockCatalog = [
	{
		id: 'gpt',
		name: 'GPT',
		type: 'llm',
		provider: mockProviders[0],
		metadata: { documentationStatus: 'verified', documentationUrl: '', inputs: {} },
	},
	{
		id: 'gemini-image',
		name: 'Gemini Image',
		type: 'text-to-image',
		provider: mockProviders[1],
		metadata: { documentationStatus: 'verified', documentationUrl: '', inputs: {} },
	},
	{
		id: 'eleven-music',
		name: 'Eleven Music',
		type: 'text-to-audio',
		provider: mockProviders[2],
		metadata: { documentationStatus: 'verified', documentationUrl: '', inputs: {} },
	},
	{
		id: 'veo',
		name: 'Veo',
		type: 'text-to-video',
		provider: mockProviders[1],
		metadata: { documentationStatus: 'verified', documentationUrl: '', inputs: {} },
	},
];

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.modelServices.assistantName': 'Agent',
		'settings.modelServices.fridayDescription': 'Chat, tools, and planning',
		'settings.modelServices.configuration': 'Configuration',
		'settings.modelServices.imageAssistantName': 'Image',
		'settings.modelServices.musicCreatorName': 'Audio',
		'settings.modelServices.videoCreatorName': 'Video',
		'settings.modelServices.imageModelDescription': 'Image defaults',
		'settings.modelServices.musicModelDescription': 'Audio defaults',
		'settings.modelServices.videoModelDescription': 'Video defaults',
		'settings.modelServices.history': 'History',
	};
	const t = (key: string): string => translations[key] ?? key;
	return { useTranslation: () => ({ t }) };
});
jest.mock('@/lib/providers', () => ({
	modelsFor: (capability: string) => mockCatalog.filter((model) => model.type === capability),
	providerIdsFor: (capability: string) => [
		...new Set(
			mockCatalog
				.filter((model) => model.type === capability)
				.map((model) => model.provider.id)
		),
	],
	providerModels: (providerId: string, capability: string) =>
		mockCatalog.filter(
			(model) => model.provider.id === providerId && model.type === capability
		),
	providers: () => mockProviders,
}));

const mediaApi = (providerId: string, modelId: string) => ({
	getProviderId: jest.fn().mockResolvedValue(providerId),
	setProviderId: jest.fn().mockResolvedValue(undefined),
	getModelId: jest.fn().mockResolvedValue(modelId),
	setModelId: jest.fn().mockResolvedValue(undefined),
	getOptions: jest.fn().mockResolvedValue({}),
	setOptions: jest.fn().mockImplementation(async (options) => options),
});

beforeEach(() => {
	Object.defineProperty(window, 'agent', {
		configurable: true,
		value: {
			getProvider: jest.fn().mockResolvedValue(mockProviders[0]),
			setProvider: jest.fn().mockResolvedValue(true),
			getModelId: jest.fn().mockResolvedValue('gpt'),
			setModelId: jest.fn().mockResolvedValue(true),
			getModelOptions: jest.fn().mockResolvedValue({}),
			setModelOptions: jest.fn().mockResolvedValue({}),
		},
	});
	Object.defineProperty(window, 'models', {
		configurable: true,
		value: {
			image: mediaApi('google', 'gemini-image'),
			sound: mediaApi('elevenlabs', 'eleven-music'),
			video: mediaApi('google', 'veo'),
		},
	});
});

it('shows image, audio, and video defaults on the Agent settings page', async () => {
	render(
		<MemoryRouter>
			<AssistantPage />
		</MemoryRouter>
	);

	expect(await screen.findByRole('button', { name: /Image.*Gemini Image/ })).toBeInTheDocument();
	expect(await screen.findByRole('button', { name: /Audio.*Eleven Music/ })).toBeInTheDocument();
	expect(await screen.findByRole('button', { name: /Video.*Veo/ })).toBeInTheDocument();
});
