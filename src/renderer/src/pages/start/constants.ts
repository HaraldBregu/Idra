import { Bot, Image as ImageIcon, Mic, Music, Video, Volume2 } from 'lucide-react';
import {
	DEFAULT_PROVIDERS,
	getProviderApiConfigurationUrl,
	type Provider,
} from '../../../../shared/providers';
import {
	ASSISTANT_OPERATOR_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	OPERATOR_DEFINITIONS,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
} from '../../../../shared/agents/service';
import type { PublicProvider } from '../../../../shared/providers';
import type { Model } from '../../../../shared/agents/service';
import type {
	ModelServiceDefinition,
	ModelServiceId,
	ModelServiceState,
	ModelServiceStateMap,
	ProviderCatalogItem,
	ProviderOption,
	SetupStep,
} from './types';

export const MODEL_SERVICE_DEFINITIONS: readonly ModelServiceDefinition[] = [
	{
		id: ASSISTANT_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.assistant.name,
		stepName: 'Assistant',
		stepTitle: 'AI assistant',
		stepDescription: 'Powers chat replies, reasoning, summaries, and planning.',
		icon: Bot,
		required: true,
		getOperator: () => window.app.getAssistantOperator(),
		getModels: (provider) => window.app.getModels(provider),
		saveOperator: (provider, model) => window.app.saveAssistantOperator(provider, model),
	},
	{
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.speechToText.name,
		stepName: 'Speech to text',
		stepTitle: 'Speech to text',
		stepDescription: 'Transcribes your voice and audio into text before Friday responds.',
		icon: Mic,
		required: false,
		getOperator: () => window.app.getSpeechToTextOperator(),
		getModels: (provider) => window.app.getSpeechToTextModels(provider),
		saveOperator: (provider, model) => window.app.saveSpeechToTextOperator(provider, model),
	},
	{
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.textToSpeech.name,
		stepName: 'Text to speech',
		stepTitle: 'Text to speech',
		stepDescription: 'The voice Friday uses when reading responses and content aloud.',
		icon: Volume2,
		required: false,
		getOperator: () => window.app.getTextToSpeechOperator(),
		getModels: (provider) => window.app.getTextToSpeechModels(provider),
		saveOperator: (provider, model) => window.app.saveTextToSpeechOperator(provider, model),
	},
	{
		id: IMAGE_CREATOR_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.imageCreator.name,
		stepName: 'Images',
		stepTitle: 'Image generation',
		stepDescription: 'Creates images and visual assets from your text prompts.',
		icon: ImageIcon,
		required: false,
		getOperator: () => window.app.getImageCreatorOperator(),
		getModels: (provider) => window.app.getImageCreatorModels(provider),
		saveOperator: (provider, model) => window.app.saveImageCreatorOperator(provider, model),
	},
	{
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.videoCreator.name,
		stepName: 'Video',
		stepTitle: 'Video generation model',
		stepDescription: 'Choose the model Friday uses when generating or editing short video clips.',
		icon: Video,
		required: false,
		getOperator: () => window.app.getTextToVideoOperator(),
		getModels: (provider) => window.app.getTextToVideoModels(provider),
		saveOperator: (provider, model) => window.app.saveTextToVideoOperator(provider, model),
	},
	{
		id: MUSIC_CREATOR_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.musicCreator.name,
		stepName: 'Music',
		stepTitle: 'Music generation model',
		stepDescription:
			'Choose the model Friday uses to generate songs, loops, and short audio compositions.',
		icon: Music,
		required: false,
		getOperator: () => window.app.getMusicCreatorOperator(),
		getModels: (provider) => window.app.getMusicCreatorModels(provider),
		saveOperator: (provider, model) => window.app.saveMusicCreatorOperator(provider, model),
	},
];

export const MODEL_SERVICE_STEP_IDS: readonly ModelServiceId[] = MODEL_SERVICE_DEFINITIONS.map(
	(service) => service.id
);

export const SETUP_STEPS: readonly SetupStep[] = [
	'presentation',
	'providers',
	...MODEL_SERVICE_STEP_IDS,
];

export const SETUP_STEP_TITLES: Record<SetupStep, string> = MODEL_SERVICE_DEFINITIONS.reduce(
	(acc, service) => ({ ...acc, [service.id]: service.stepName }),
	{ presentation: 'Welcome', providers: 'Providers' } as Record<SetupStep, string>
);

export const MASKED_API_KEY_LABEL = 'sk-************' as const;

export const STEP_COPY: Record<'presentation' | 'providers', { title: string; description: string }> =
	{
		presentation: {
			title: 'Welcome to Friday',
			description:
				'Configure providers first, then choose the exact model Friday should use for each capability.',
		},
		providers: {
			title: 'Connect a provider',
			description: 'Add an API key to get started. Keys are stored locally on your device.',
		},
	};

function normalizeProvider(provider: Provider, index: number): ProviderOption {
	const value = provider.id || `provider-${index}`;
	const label = provider.name || value;
	return { label, value };
}

export const providerOptions = DEFAULT_PROVIDERS.map((provider, index) =>
	normalizeProvider(provider, index)
);

export const supportedProviderIds = new Set(providerOptions.map((provider) => provider.value));

export const actionableProviderCatalog: readonly ProviderCatalogItem[] = DEFAULT_PROVIDERS.map(
	(provider) => ({
		id: provider.id,
		name: provider.name,
		capabilities: provider.capabilities ?? 'AI provider',
		supported: true,
		apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
	})
);

export function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

export function getProviderCatalogItem(providerId: string): ProviderCatalogItem {
	return (
		actionableProviderCatalog.find((provider) => provider.id === providerId) ?? {
			id: providerId,
			name: providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId,
			capabilities: 'Chat',
			supported: supportedProviderIds.has(providerId),
		}
	);
}

export function isModelStep(step: SetupStep): step is ModelServiceId {
	return step !== 'presentation' && step !== 'providers';
}

export function createInitialModelServiceState(): ModelServiceStateMap {
	return MODEL_SERVICE_DEFINITIONS.reduce(
		(acc, service) => ({
			...acc,
			[service.id]: { providerId: '', modelId: '', modelGroups: [] },
		}),
		{} as ModelServiceStateMap
	);
}

export function getSelectedServiceModel(
	serviceState: ModelServiceState
): { provider: PublicProvider; model: Model } | undefined {
	const selectedProvider = serviceState.modelGroups.find(
		(group) => group.provider.id === serviceState.providerId
	);
	const selectedModel = selectedProvider?.models.find(
		(model) => model.id === serviceState.modelId
	);
	return selectedProvider && selectedModel
		? { provider: selectedProvider.provider, model: selectedModel }
		: undefined;
}
