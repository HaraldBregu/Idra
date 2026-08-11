import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VoicePage from '../../../src/renderer/src/pages/settings/pages/voice/Page';

const openai = { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' };
const realtimeModels = [
	{
		id: 'gpt-realtime-2.1',
		name: 'GPT Realtime 2.1',
		metadata: {
			documentationUrl: 'https://example.com/realtime',
			documentationStatus: 'verified' as const,
			inputs: {
				voice: {
					type: 'string' as const,
					title: 'Voice',
					default: 'marin',
					enum: ['marin', 'cedar'],
				},
			},
		},
	},
];
const speechModels = [{ id: 'gpt-4o-mini-tts', name: 'GPT 4o Mini TTS' }];

jest.mock('react-i18next', () => {
	const t = (key: string): string => key;
	return { useTranslation: () => ({ t }) };
});
jest.mock('@/lib/providers', () => ({
	defaultProviderId: () => 'openai',
	modelsFor: () => realtimeModels.map((model) => ({ ...model, default: true, provider: openai })),
	providerIdsFor: (capability: string) =>
		capability === 'text-to-speech' ? ['openai'] : capability === 'realtime-voice' ? ['openai'] : [],
	providerModels: (_providerId: string, capability: string) =>
		capability === 'realtime-voice' ? realtimeModels : speechModels,
	providers: () => [openai],
}));
jest.mock('@/pages/home/hooks', () => ({
	useReadMessageAloud: () => ({
		speak: jest.fn(),
		isSpeaking: false,
		errorMessage: null,
		clearError: jest.fn(),
	}),
}));

const realtimeApi = {
	getProviderId: jest.fn(),
	setProviderId: jest.fn(),
	getModelId: jest.fn(),
	setModelId: jest.fn(),
	getOptions: jest.fn(),
	setOptions: jest.fn(),
};
const voiceApi = {
	getProviderId: jest.fn(),
	setProviderId: jest.fn(),
	getModelId: jest.fn(),
	setModelId: jest.fn(),
	getOptions: jest.fn(),
	setOptions: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(globalThis, 'structuredClone', {
		configurable: true,
		value: <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
	});
	realtimeApi.getProviderId.mockResolvedValue(undefined);
	realtimeApi.getModelId.mockResolvedValue(undefined);
	realtimeApi.getOptions.mockResolvedValue({});
	realtimeApi.setProviderId.mockResolvedValue(undefined);
	realtimeApi.setModelId.mockResolvedValue(undefined);
	realtimeApi.setOptions.mockImplementation(async (options) => options);
	voiceApi.getProviderId.mockResolvedValue('openai');
	voiceApi.getModelId.mockResolvedValue('gpt-4o-mini-tts');
	voiceApi.getOptions.mockResolvedValue({});
	voiceApi.setProviderId.mockResolvedValue(undefined);
	voiceApi.setModelId.mockResolvedValue(undefined);
	voiceApi.setOptions.mockImplementation(async (options) => options);
	window.models = {
		realtimeVoice: realtimeApi,
		voice: voiceApi,
	} as unknown as Window['models'];
});

it('shows OpenAI realtime separately from Read aloud without saving displayed defaults', async () => {
	render(<VoicePage />);

	expect(
		await screen.findByRole('button', { name: /settings\.modelServices\.realtimeVoiceConfiguration/ })
	).toBeInTheDocument();
	expect(screen.getByRole('button', { name: /settings\.modelServices\.readAloudConfiguration/ })).toBeInTheDocument();
	expect(
		await screen.findByRole('combobox', {
			name: 'settings.modelServices.realtimeVoiceConfiguration',
		})
	).toHaveTextContent('OpenAI / GPT Realtime 2.1');
	expect(await screen.findByRole('combobox', { name: 'Voice' })).toHaveTextContent('marin');
	expect(realtimeApi.setProviderId).not.toHaveBeenCalled();
	expect(realtimeApi.setModelId).not.toHaveBeenCalled();
	expect(realtimeApi.setOptions).not.toHaveBeenCalled();
});

it('persists a selected realtime voice with the current model', async () => {
	const user = userEvent.setup();
	render(<VoicePage />);
	const voiceSelect = await screen.findByRole('combobox', { name: 'Voice' });
	await user.click(voiceSelect);
	await user.click(await screen.findByRole('option', { name: 'cedar', hidden: true }));

	await waitFor(() => {
		expect(realtimeApi.setProviderId).toHaveBeenCalledWith('openai');
		expect(realtimeApi.setModelId).toHaveBeenCalledWith('gpt-realtime-2.1');
		expect(realtimeApi.setOptions).toHaveBeenCalledWith({ voice: 'cedar' });
	});
});
