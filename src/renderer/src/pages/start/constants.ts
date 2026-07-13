import {
	DEFAULT_PROVIDERS,
	getProviderApiConfigurationUrl,
} from '../../../../shared';
import {
	cloneModels,
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
	MUSIC_PROVIDER_IDS,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_PROVIDER_IDS,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_IDS,
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_PROVIDER_IDS,
} from '../../../../shared/provider_models_definitions';
import type { PublicProvider } from '../../../../shared';
import type { Model } from '@/lib/compat';
import type {
	ModelServiceDefinition,
	ModelServiceState,
	ModelServiceStateMap,
	ProviderCatalogItem,
	ProviderModelGroup,
	ProviderOption,
	SetupStep,
} from './types';

type CatalogProvider = (typeof DEFAULT_PROVIDERS)[number];

function toPublicProvider(provider: CatalogProvider): PublicProvider {
	return {
		id: provider.id,
		name: provider.name,
		baseUrl: provider.baseUrl,
		...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
		...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
	};
}

function toModelGroups(
	providerIds: readonly string[],
	modelsByProvider: Record<string, readonly Model[]>
): ProviderModelGroup[] {
	return providerIds.flatMap((providerId) => {
		const provider = DEFAULT_PROVIDERS.find((item) => item.id === providerId);
		const models = cloneModels(modelsByProvider[providerId]);
		return provider && models.length > 0
			? [{ provider: toPublicProvider(provider), models }]
			: [];
	});
}

function getLlmModelGroups(): ProviderModelGroup[] {
	return toModelGroups(LLM_PROVIDERS, LLM_MODELS_BY_PROVIDER);
}

type ModelIdApi = {
	getProviderId: () => Promise<string | undefined>;
	setProviderId: (providerId: string) => Promise<void>;
	getModelId: () => Promise<string | undefined>;
	setModelId: (modelId: string) => Promise<void>;
};

function toIdSelectionHandlers(
	getApi: () => ModelIdApi
): Pick<ModelServiceDefinition, 'getSelection' | 'saveSelection'> {
	return {
		getSelection: async () => {
			const api = getApi();
			const [providerId, modelId] = await Promise.all([api.getProviderId(), api.getModelId()]);
			return providerId && modelId ? { providerId, modelId } : undefined;
		},
		saveSelection: async (provider, model) => {
			const api = getApi();
			await api.setProviderId(provider.id);
			await api.setModelId(model.id);
			return true;
		},
	};
}

async function getTranscriptionModelGroups(): Promise<ProviderModelGroup[]> {
	const providers = await window.transcribe.listProviders();
	const modelGroups: ProviderModelGroup[] = [];
	for (const provider of providers) {
		const models = await window.transcribe.listModels(provider.id);
		if (models.length > 0) modelGroups.push({ provider, models });
	}
	return modelGroups;
}

export const MODEL_SERVICE_DEFINITIONS: readonly ModelServiceDefinition[] = [
	{
		id: 'assistant',
		title: 'Assistant',
		description: 'Powers chat replies, reasoning, summaries, and planning.',
		getSelection: async () => {
			const [provider, modelId] = await Promise.all([
				window.agent.getProvider(),
				window.agent.getModelId(),
			]);
			return provider && modelId ? { providerId: provider.id, modelId } : undefined;
		},
		loadModelGroups: () => Promise.resolve(getLlmModelGroups()),
		saveSelection: async (provider, model) => {
			await window.agent.setProvider(provider);
			return window.agent.setModelId(model.id);
		},
	},
	{
		id: 'voice',
		title: 'Voice',
		description: 'Reads responses aloud with text-to-speech.',
		loadModelGroups: () =>
			Promise.resolve(toModelGroups(TEXT_TO_SPEECH_PROVIDER_IDS, TEXT_TO_SPEECH_MODELS_BY_PROVIDER)),
		...toIdSelectionHandlers(() => window.voice),
	},
	{
		id: 'transcription',
		title: 'Transcription',
		description: 'Converts your speech into text.',
		getSelection: async () => {
			const selection = await window.transcribe.getSelection();
			return selection
				? { providerId: selection.provider.id, modelId: selection.model.id }
				: undefined;
		},
		loadModelGroups: getTranscriptionModelGroups,
		saveSelection: (provider, model) => window.transcribe.saveSelection(provider.id, model.id),
	},
	{
		id: 'tasks',
		title: 'Tasks',
		description: 'Runs your scheduled tasks in the background.',
		getSelection: async () => {
			const runtime = await window.agent.cronGetRuntime();
			return runtime?.providerId && runtime.modelId
				? { providerId: runtime.providerId, modelId: runtime.modelId }
				: undefined;
		},
		loadModelGroups: () => Promise.resolve(getLlmModelGroups()),
		saveSelection: async (provider, model) => {
			await window.agent.cronSetRuntime(provider.id, model.id);
			return true;
		},
	},
	{
		id: 'health',
		title: 'Health',
		description: 'Runs periodic checks and reports issues.',
		getSelection: async () => {
			const settings = await window.agent.healthGetSettings();
			return settings.providerId && settings.modelId
				? { providerId: settings.providerId, modelId: settings.modelId }
				: undefined;
		},
		loadModelGroups: () => Promise.resolve(getLlmModelGroups()),
		saveSelection: async (provider, model) => {
			await window.agent.healthSaveSettings({ providerId: provider.id, modelId: model.id });
			return true;
		},
	},
];

export const SETUP_STEPS: readonly SetupStep[] = ['presentation', 'providers', 'models'];

export const SETUP_STEP_TITLES: Record<SetupStep, string> = {
	presentation: 'Welcome',
	providers: 'Providers',
	models: 'Models',
};

export const MASKED_API_KEY_LABEL = 'sk-************' as const;

export const STEP_COPY: Record<SetupStep, { title: string; description: string }> = {
	presentation: {
		title: 'Welcome to Friday',
		description:
			'Connect an AI provider and pick the model that powers your assistant. It only takes a minute.',
	},
	providers: {
		title: 'Connect a provider',
		description:
			'Add at least one API key to continue. You can connect more providers at any time.',
	},
	models: {
		title: 'Choose your models',
		description:
			'Pick the model each service should use. Only the assistant is required — you can change any of these later in settings.',
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
