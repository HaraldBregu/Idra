import { Bot, Image as ImageIcon, Mic, Volume2 } from 'lucide-react';
import {
	DEFAULT_PROVIDERS,
	getProviderApiConfigurationUrl,
} from '../../../../shared';
import {
	cloneModels,
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
	normalizeProviderId,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	supportsSpeechToTextModelApiType,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_PROVIDER_IDS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_IDS,
} from '../../../../shared/provider_models_definitions';
import type { SpeechToTextApiType } from '../../../../shared/provider_models_types';
import type { SttSelectionMode } from '../../../../shared/stt_transcription';
import { AGENTS } from '@/lib/compat';
import { mergeModels, mergeProviders } from '@pages/settings/components/model-configuration-state';
import type { PublicProvider } from '../../../../shared';
import type { Model } from '@/lib/compat';
import type {
	ModelServiceDefinition,
	ModelServiceId,
	ModelServiceState,
	ModelServiceStateMap,
	ProviderCatalogItem,
	ProviderModelGroup,
	ProviderOption,
	SetupStep,
	SpeechModeStateMap,
} from './types';

type CatalogProvider = (typeof DEFAULT_PROVIDERS)[number];

function getImageModels(providerId: string): Model[] {
	return cloneModels(TEXT_TO_IMAGE_MODELS_BY_PROVIDER[normalizeProviderId(providerId)]);
}

function getVoiceModels(providerId: string): Model[] {
	return cloneModels(TEXT_TO_SPEECH_MODELS_BY_PROVIDER[normalizeProviderId(providerId)]);
}

function getAssistantModels(providerId: string): Model[] {
	return [...(LLM_MODELS_BY_PROVIDER[providerId] ?? [])];
}

function toPublicProvider(provider: CatalogProvider): PublicProvider {
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
		...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
		...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
	};
}

function getCatalogProvidersByIds(providerIds: readonly string[]): PublicProvider[] {
	return providerIds.flatMap((providerId) => {
		const provider = DEFAULT_PROVIDERS.find((item) => item.id === providerId);
		return provider ? [toPublicProvider(provider)] : [];
	});
}

export async function getProvidersForService(serviceId: ModelServiceId): Promise<PublicProvider[]> {
	if (serviceId === AGENTS.assistant) {
		return getCatalogProvidersByIds(
			LLM_PROVIDERS.filter((providerId) => getAssistantModels(providerId).length > 0)
		);
	}
	if (serviceId === AGENTS.speechToText) {
		return window.transcribe.listProviders();
	}
	if (serviceId === AGENTS.textToSpeech) {
		return getCatalogProvidersByIds(TEXT_TO_SPEECH_PROVIDER_IDS);
	}
	if (serviceId === AGENTS.textToImage) {
		return getCatalogProvidersByIds(TEXT_TO_IMAGE_PROVIDER_IDS);
	}
	return [];
}

export const MODEL_SERVICE_DEFINITIONS: readonly ModelServiceDefinition[] = [
	{
		id: AGENTS.assistant,
		label: 'AI Assistant',
		stepName: 'Assistant',
		stepTitle: 'AI assistant',
		stepDescription: 'Powers chat replies, reasoning, summaries, and planning.',
		icon: Bot,
		required: true,
		getSelection: async () => {
			const [provider, modelId] = await Promise.all([
				window.agent.getProvider(),
				window.agent.getModelId(),
			]);
			if (!provider || !modelId) return undefined;
			const model = getAssistantModels(provider.id).find((item) => item.id === modelId);
			if (!model) return undefined;
			return { provider, model };
		},
		getModels: (provider) => Promise.resolve(getAssistantModels(provider.id)),
		saveSelection: async (provider, model) => {
			await window.agent.setProvider(provider);
			return window.agent.setModelId(model.id);
		},
	},
	{
		id: AGENTS.speechToText,
		label: 'Transcribe',
		stepName: 'Transcribe',
		stepTitle: 'Transcribe',
		stepDescription: 'Transcribes your voice and audio into text before Friday responds.',
		icon: Mic,
		required: false,
		getSelection: () => window.transcribe.getSelection(),
		getModels: (provider) => window.transcribe.listModels(provider.id),
		saveSelection: (provider, model) => window.transcribe.saveSelection(provider.id, model.id),
	},
	{
		id: AGENTS.textToSpeech,
		label: 'Voice',
		stepName: 'Voice',
		stepTitle: 'Voice',
		stepDescription: 'The voice Friday uses when reading responses and content aloud.',
		icon: Volume2,
		required: false,
		getSelection: async () => {
			const [providerId, modelId] = await Promise.all([
				window.voice.getProviderId(),
				window.voice.getModelId(),
			]);
			if (!providerId || !modelId) return undefined;
			const provider = DEFAULT_PROVIDERS.find((item) => item.id === providerId);
			const model = getVoiceModels(providerId).find((item) => item.id === modelId);
			if (!provider || !model) return undefined;
			const { apiKey: _apiKey, ...publicProvider } = provider;
			return { provider: publicProvider, model };
		},
		getModels: (provider) => Promise.resolve(getVoiceModels(provider.id)),
		saveSelection: async (provider, model) => {
			await window.voice.setProviderId(provider.id);
			await window.voice.setModelId(model.id);
			return true;
		},
	},
	{
		id: AGENTS.textToImage,
		label: 'Image',
		stepName: 'Image',
		stepTitle: 'Image',
		stepDescription: 'Creates images and visual assets from your text prompts.',
		icon: ImageIcon,
		required: false,
		getSelection: async () => {
			const [providerId, modelId] = await Promise.all([
				window.image.getProviderId(),
				window.image.getModelId(),
			]);
			if (!providerId || !modelId) return undefined;
			const provider = DEFAULT_PROVIDERS.find((item) => item.id === providerId);
			const model = getImageModels(providerId).find((item) => item.id === modelId);
			if (!provider || !model) return undefined;
			const { apiKey: _apiKey, ...publicProvider } = provider;
			return { provider: publicProvider, model };
		},
		getModels: (provider) => Promise.resolve(getImageModels(provider.id)),
		saveSelection: async (provider, model) => {
			await window.image.setProviderId(provider.id);
			await window.image.setModelId(model.id);
			return true;
		},
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
				'Connect your AI providers and pick a model for each capability. It only takes a minute.',
		},
		providers: {
			title: 'Connect a provider',
			description:
				'Add at least one API key to continue. You can connect more providers at any time.',
		},
	};

function normalizeProvider(provider: CatalogProvider, index: number): ProviderOption {
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
