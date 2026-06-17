import { Bot, Image as ImageIcon, Mic, Music, Video, Volume2 } from 'lucide-react';
import { DEFAULT_PROVIDERS, getProviderApiConfigurationUrl, } from '../../../../shared/providers';
import { AGENTS } from '@/lib/compat';
import { appApi } from '@/lib/compat';
export const MODEL_SERVICE_DEFINITIONS = [
    {
        id: AGENTS.assistant,
        label: 'AI Assistant',
        stepName: 'Assistant',
        stepTitle: 'AI assistant',
        stepDescription: 'Powers chat replies, reasoning, summaries, and planning.',
        icon: Bot,
        required: true,
        getSelection: () => appApi.getAgentService(),
        getModels: (provider) => appApi.getModels(provider),
        saveSelection: (provider, model) => appApi.saveAgentService(provider, model),
    },
    {
        id: AGENTS.speechToText,
        label: 'Speech to Text',
        stepName: 'Speech to text',
        stepTitle: 'Speech to text',
        stepDescription: 'Transcribes your voice and audio into text before Friday responds.',
        icon: Mic,
        required: false,
        getSelection: () => window.stt.getSelection(),
        getModels: (provider) => window.stt.listModels(provider.id),
        saveSelection: (provider, model) => window.stt.saveSelection(provider.id, model.id),
    },
    {
        id: AGENTS.textToSpeech,
        label: 'Text to Speech',
        stepName: 'Text to speech',
        stepTitle: 'Text to speech',
        stepDescription: 'The voice Friday uses when reading responses and content aloud.',
        icon: Volume2,
        required: false,
        getSelection: () => appApi.getTextToSpeechService(),
        getModels: (provider) => appApi.getTextToSpeechModels(provider),
        saveSelection: (provider, model) => appApi.saveTextToSpeechService(provider, model),
    },
    {
        id: AGENTS.textToImage,
        label: 'Text to Image',
        stepName: 'Images',
        stepTitle: 'Image generation',
        stepDescription: 'Creates images and visual assets from your text prompts.',
        icon: ImageIcon,
        required: false,
        getSelection: () => appApi.getImageCreatorService(),
        getModels: (provider) => appApi.getImageCreatorModels(provider),
        saveSelection: (provider, model) => appApi.saveImageCreatorService(provider, model),
    },
    {
        id: AGENTS.textToVideo,
        label: 'Text to Video',
        stepName: 'Video',
        stepTitle: 'Video generation',
        stepDescription: 'Generates and edits short clips from prompts or existing footage.',
        icon: Video,
        required: false,
        getSelection: () => appApi.getTextToVideoService(),
        getModels: (provider) => appApi.getTextToVideoModels(provider),
        saveSelection: (provider, model) => appApi.saveTextToVideoService(provider, model),
    },
    {
        id: AGENTS.textToAudio,
        label: 'Text to Audio',
        stepName: 'Music',
        stepTitle: 'Music generation',
        stepDescription: 'Composes songs, loops, and short audio pieces.',
        icon: Music,
        required: false,
        getSelection: () => appApi.getTextToSoundService(),
        getModels: (provider) => appApi.getTextToSoundModels(provider),
        saveSelection: (provider, model) => appApi.saveTextToSoundService(provider, model),
    },
];
export const MODEL_SERVICE_STEP_IDS = MODEL_SERVICE_DEFINITIONS.map((service) => service.id);
export const SETUP_STEPS = [
    'presentation',
    'providers',
    ...MODEL_SERVICE_STEP_IDS,
];
export const SETUP_STEP_TITLES = MODEL_SERVICE_DEFINITIONS.reduce((acc, service) => ({ ...acc, [service.id]: service.stepName }), { presentation: 'Welcome', providers: 'Providers' });
export const MASKED_API_KEY_LABEL = 'sk-************';
export const STEP_COPY = {
    presentation: {
        title: 'Welcome to Friday',
        description: 'Connect your AI providers and pick a model for each capability. It only takes a minute.',
    },
    providers: {
        title: 'Connect a provider',
        description: 'Add at least one API key to continue. You can connect more providers at any time.',
    },
};
function normalizeProvider(provider, index) {
    const value = provider.id || `provider-${index}`;
    const label = provider.name || value;
    return { label, value };
}
export const providerOptions = DEFAULT_PROVIDERS.map((provider, index) => normalizeProvider(provider, index));
export const supportedProviderIds = new Set(providerOptions.map((provider) => provider.value));
export const actionableProviderCatalog = DEFAULT_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    capabilities: provider.capabilities ?? 'AI provider',
    supported: true,
    apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
}));
export function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
}
export function getProviderCatalogItem(providerId) {
    return (actionableProviderCatalog.find((provider) => provider.id === providerId) ?? {
        id: providerId,
        name: providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId,
        capabilities: 'Chat',
        supported: supportedProviderIds.has(providerId),
    });
}
export function isModelStep(step) {
    return step !== 'presentation' && step !== 'providers';
}
export function createInitialModelServiceState() {
    return MODEL_SERVICE_DEFINITIONS.reduce((acc, service) => ({
        ...acc,
        [service.id]: { providerId: '', modelId: '', modelGroups: [] },
    }), {});
}
export function getSelectedServiceModel(serviceState) {
    const selectedProvider = serviceState.modelGroups.find((group) => group.provider.id === serviceState.providerId);
    const selectedModel = selectedProvider?.models.find((model) => model.id === serviceState.modelId);
    return selectedProvider && selectedModel
        ? { provider: selectedProvider.provider, model: selectedModel }
        : undefined;
}
