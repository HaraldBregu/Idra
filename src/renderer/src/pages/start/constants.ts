import { getProviderApiConfigurationUrl } from '../../../../shared';
import {
	databaseProviders,
	databases,
	providerIdsFor,
	providerModels,
	providers,
} from '@/lib/providers';
import type { ModelCapability } from '../../../../shared/model_types';
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

type CatalogProvider = PublicProvider;

function toModelGroups(type: ModelCapability): ProviderModelGroup[] {
	return providerIdsFor(type).flatMap((providerId) => {
		const provider = providers().find((item) => item.id === providerId);
		const models = providerModels(providerId, type);
		return provider && models.length > 0 ? [{ provider, models }] : [];
	});
}

function getLlmModelGroups(): ProviderModelGroup[] {
	return toModelGroups('llm');
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
	const providers = await window.models.transcribe.listProviders();
	const modelGroups: ProviderModelGroup[] = [];
	for (const provider of providers) {
		const models = await window.models.transcribe.listModels(provider.id);
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
			Promise.resolve(toModelGroups('text-to-speech')),
		...toIdSelectionHandlers(() => window.models.voice),
	},
	{
		id: 'transcription',
		title: 'Transcription',
		description: 'Converts your speech into text.',
		getSelection: async () => {
			const selection = await window.models.transcribe.getSelection();
			return selection
				? { providerId: selection.provider.id, modelId: selection.model.id }
				: undefined;
		},
		loadModelGroups: getTranscriptionModelGroups,
		saveSelection: (provider, model) => window.models.transcribe.saveSelection(provider.id, model.id),
	},
	{
		id: 'image',
		title: 'Image',
		description: 'Generates images from your prompts.',
		loadModelGroups: () =>
			Promise.resolve(toModelGroups('text-to-image')),
		...toIdSelectionHandlers(() => window.models.image),
	},
	{
		id: 'video',
		title: 'Video',
		description: 'Generates videos from your prompts.',
		loadModelGroups: () =>
			Promise.resolve(toModelGroups('text-to-video')),
		...toIdSelectionHandlers(() => window.models.video),
	},
	{
		id: 'audio',
		title: 'Audio',
		description: 'Generates music and sounds from your prompts.',
		loadModelGroups: () =>
			Promise.resolve(toModelGroups('text-to-audio')),
		...toIdSelectionHandlers(() => window.models.sound),
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
		title: "Hi, I'm Friday",
		description:
			"Your personal AI agent. I can help with everyday tasks, write code, and keep working in the background while you're away.",
	},
	providers: {
		title: 'Connect your providers',
		description:
			'Add at least one model provider API key to continue. You can connect more providers at any time.',
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

export function providerOptions(): ProviderOption[] {
	return providers().map((provider, index) => normalizeProvider(provider, index));
}

export function supportedProviderIds(): Set<string> {
	return new Set(providerOptions().map((provider) => provider.value));
}

export function actionableProviderCatalog(): readonly ProviderCatalogItem[] {
	return providers().map((provider) => ({
		id: provider.id,
		name: provider.name,
		capabilities: provider.capabilities ?? 'AI provider',
		supported: true,
		apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
	}));
}

/** Providers with at least one database, shaped like the models catalog cards. */
export function actionableDatabaseCatalog(): readonly ProviderCatalogItem[] {
	return databaseProviders().map((provider) => ({
		id: provider.id,
		name: provider.name,
		capabilities:
			databases()
				.filter((entry) => entry.provider.id === provider.id)
				.map((entry) => entry.name)
				.join(' - ') || 'Database',
		supported: true,
		apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
	}));
}

export function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

export function getProviderCatalogItem(providerId: string): ProviderCatalogItem {
	return (
		actionableProviderCatalog().find((provider) => provider.id === providerId) ?? {
			id: providerId,
			name:
				providerOptions().find((provider) => provider.value === providerId)?.label ?? providerId,
			capabilities: 'Chat',
			supported: supportedProviderIds().has(providerId),
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
