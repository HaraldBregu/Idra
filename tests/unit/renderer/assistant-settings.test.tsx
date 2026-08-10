import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
		'settings.modelServices.subtitle': 'Configure model assignments',
		'settings.modelServices.imageAssistantName': 'Image',
		'settings.modelServices.musicCreatorName': 'Audio',
		'settings.modelServices.videoCreatorName': 'Video',
		'settings.modelServices.imageModelDescription': 'Image defaults',
		'settings.modelServices.musicModelDescription': 'Audio defaults',
		'settings.modelServices.videoModelDescription': 'Video defaults',
		'settings.modelServices.modelDescription': 'Choose provider and model',
		'settings.modelServices.history': 'History',
		'settings.tabs.searchEngine': 'Search Engine',
		'settings.dataControls.title': 'Data management',
		'settings.dataControls.description': 'Export or purge assistant data',
		'settings.rag.title': 'Knowledge Base',
		'settings.rag.description': 'Index and search local documents',
		'settings.wiki.title': 'LLM Wiki',
		'settings.wiki.description': 'Build a persistent Markdown wiki',
	};
	const t = (key: string): string => translations[key] ?? key;
	return { useTranslation: () => ({ t }) };
});
jest.mock('@/lib/providers', () => ({
	modelsFor: (capability: string) => mockCatalog.filter((model) => model.type === capability),
	providerIdsFor: (capability: string) => [
		...new Set(
			mockCatalog.filter((model) => model.type === capability).map((model) => model.provider.id)
		),
	],
	providerModels: (providerId: string, capability: string) =>
		mockCatalog.filter((model) => model.provider.id === providerId && model.type === capability),
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
			ragGetConfiguration: jest.fn().mockResolvedValue({ indexName: 'knowledge-base' }),
			listSessions: jest.fn().mockResolvedValue([
				{
					id: '11111111-1111-4111-8111-111111111111',
					title: 'Session',
					createdAtMs: 1,
				},
			]),
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
	Object.defineProperty(window, 'search', {
		configurable: true,
		value: {
			getSettings: jest.fn().mockResolvedValue({
				engineId: 'brave',
				configured: { brave: true, tavily: false },
			}),
			selectEngine: jest.fn().mockImplementation(async (engineId: string) => ({
				engineId,
				configured: { brave: true, tavily: false },
			})),
		},
	});
	Object.defineProperty(window, 'wiki', {
		configurable: true,
		value: { getSettings: jest.fn().mockResolvedValue({ targetPath: '/wiki' }) },
	});
	jest.clearAllMocks();
});

it('groups provider settings in an expandable Configuration card', async () => {
	const user = userEvent.setup();
	render(
		<MemoryRouter>
			<AssistantPage />
		</MemoryRouter>
	);

	expect(screen.queryByRole('heading', { name: 'Configuration' })).not.toBeInTheDocument();
	expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
	expect(screen.queryByRole('combobox', { name: 'Image' })).not.toBeInTheDocument();
	const providersConfigurations = await screen.findByRole('button', {
		name: /Configuration.*Configure model assignments/,
	});
	expect(providersConfigurations).toHaveAttribute('aria-expanded', 'false');
	await user.click(providersConfigurations);
	expect(providersConfigurations).toHaveAttribute('aria-expanded', 'true');
	expect(await screen.findByRole('combobox', { name: 'Agent' })).toHaveTextContent('OpenAI / GPT');
	expect(await screen.findByRole('combobox', { name: 'Image' })).toHaveTextContent(
		'Google / Gemini Image'
	);
	expect(await screen.findByRole('combobox', { name: 'Audio' })).toHaveTextContent(
		'ElevenLabs / Eleven Music'
	);
	expect(await screen.findByRole('combobox', { name: 'Video' })).toHaveTextContent('Google / Veo');
	expect(await screen.findByRole('combobox', { name: 'Search Engine' })).toHaveTextContent('Brave');

	const wiki = screen.getByRole('button', { name: /LLM Wiki/ });
	const dataManagement = screen.getByRole('button', { name: /Data management/ });
	expect(wiki.compareDocumentPosition(dataManagement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(dataManagement.closest('[data-slot="card"]')).not.toBe(
		wiki.closest('[data-slot="card"]')
	);
});

it.each([
	['Data management', '/settings/assistant/data'],
	['Knowledge Base', '/settings/assistant/knowledge-base'],
	['LLM Wiki', '/settings/assistant/llm-wiki'],
])('opens %s from the Agent settings page', async (label, path) => {
	const user = userEvent.setup();
	render(
		<MemoryRouter initialEntries={['/settings/assistant']}>
			<Routes>
				<Route path="/settings/assistant" element={<AssistantPage />} />
				<Route path={path} element={<p>{label} page</p>} />
			</Routes>
		</MemoryRouter>
	);

	await user.click(screen.getByRole('button', { name: new RegExp(label) }));
	expect(await screen.findByText(`${label} page`)).toBeInTheDocument();
});
