import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Bot, ChevronDown, Check, Database, ExternalLink, FileSearch, ImageIcon, KeyRound, LoaderCircle, Mic, Music, Pencil, Video, Volume2, } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_PROVIDERS, getProviderApiConfigurationUrl, } from '../../../../shared/providers';
import { LLM_MODELS_BY_PROVIDER, LLM_PROVIDERS } from '../../../../shared/providers/models/llm';
import { AGENTS } from '@/lib/compat';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { SettingsField, SettingsNotice, SettingsPanel } from '../settings/components';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';
const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY_LABEL = 'sk-************';
const AGENT_MODEL_VALUE_SEPARATOR = '::';
const SETUP_STEPS = ['presentation', 'providers', 'models'];
const MODEL_AREA_IDS = [
    AGENTS.assistant,
    AGENTS.speechToText,
    AGENTS.textToSpeech,
    AGENTS.textToImage,
    AGENTS.textToVideo,
    AGENTS.textToAudio,
    AGENTS.documentReader,
    AGENTS.embedding,
];
const STEP_TITLES = {
    presentation: 'Presentation',
    providers: 'Provider setup',
    models: 'Configure models',
};
const MODEL_AREAS = [
    {
        id: AGENTS.assistant,
        title: `${PRODUCT_NAME} Assistant`,
        purpose: 'Main chat and agent reasoning model.',
        icon: Bot,
    },
    {
        id: AGENTS.speechToText,
        title: 'Voice Input',
        purpose: 'Dictation and transcription model.',
        icon: Mic,
    },
    {
        id: AGENTS.textToSpeech,
        title: 'Voice Output',
        purpose: 'Spoken output model.',
        icon: Volume2,
    },
    {
        id: AGENTS.textToImage,
        title: 'Text to Image',
        purpose: 'Image generation model area.',
        icon: ImageIcon,
    },
    {
        id: AGENTS.textToVideo,
        title: 'Text to Video',
        purpose: 'Video generation model area.',
        icon: Video,
    },
    {
        id: AGENTS.textToAudio,
        title: 'Text to Audio',
        purpose: 'Sound and music generation model area.',
        icon: Music,
    },
    {
        id: AGENTS.documentReader,
        title: 'OCR',
        purpose: 'Document reading setup.',
        icon: FileSearch,
    },
    {
        id: AGENTS.embedding,
        title: 'Embedding',
        purpose: 'Future semantic indexing model setup.',
        icon: Database,
    },
];
const MODEL_FIELD_IDS = {
    [AGENTS.assistant]: { provider: 'agent-provider', model: 'agent-model' },
    [AGENTS.speechToText]: { provider: 'speech-provider', model: 'speech-model' },
    [AGENTS.textToSpeech]: { provider: 'tts-provider', model: 'tts-model' },
    [AGENTS.textToImage]: { provider: 'image-provider', model: 'image-model' },
    [AGENTS.textToVideo]: { provider: 'video-provider', model: 'video-model' },
    [AGENTS.textToAudio]: { provider: 'audio-provider', model: 'audio-model' },
};
function normalizeProvider(provider, index) {
    const value = provider.id || `provider-${index}`;
    const label = provider.name || value;
    return { label, value };
}
const providerOptions = DEFAULT_PROVIDERS.map((provider, index) => normalizeProvider(provider, index));
const supportedProviderIds = new Set(providerOptions.map((provider) => provider.value));
const actionableProviderCatalog = DEFAULT_PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    capabilities: provider.capabilities ?? 'AI provider',
    supported: true,
    apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
}));
function getErrorMessage(error, fallback) {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
}
function getProviderCatalogItem(providerId) {
    return (actionableProviderCatalog.find((provider) => provider.id === providerId) ?? {
        id: providerId,
        name: providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId,
        capabilities: 'Chat',
        supported: supportedProviderIds.has(providerId),
    });
}
function toPublicProvider(provider) {
    return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        ...(provider.capabilities ? { capabilities: provider.capabilities } : {}),
        ...(provider.apiConfiguration ? { apiConfiguration: provider.apiConfiguration } : {}),
    };
}
function getCatalogProviderById(providerId) {
    const providersById = new Map(DEFAULT_PROVIDERS.map((provider) => [provider.id, provider]));
    return providersById.get(providerId);
}
function toStoredProvider(providerId, apiKey) {
    const provider = getCatalogProviderById(providerId);
    if (!provider)
        return undefined;
    return {
        name: provider.name,
        apiKey,
        baseUrl: provider.baseUrl,
    };
}
function getStoredProvider(providerId) {
    return window.provider.get(providerId);
}
function saveStoredProvider(providerId, provider) {
    return window.provider.set(providerId, provider);
}
function getLlmProvidersFromCatalog() {
    return LLM_PROVIDERS.flatMap((providerId) => {
        const provider = getCatalogProviderById(providerId);
        return provider ? [toPublicProvider(provider)] : [];
    });
}
function getLlmProviderSelectItems() {
    return LLM_PROVIDERS.flatMap((providerId) => {
        const provider = getCatalogProviderById(providerId);
        return provider ? [{ id: provider.id, label: provider.name }] : [];
    });
}
function getProviderLlmModels(providerId) {
    return [...(LLM_MODELS_BY_PROVIDER[providerId] ?? [])];
}
function getAgentModelValue(providerId, modelId) {
    return `${providerId}${AGENT_MODEL_VALUE_SEPARATOR}${modelId}`;
}
function getProviderModelOption(groups, providerId, modelId) {
    const group = groups.find((item) => item.provider.id === providerId);
    const model = group?.models.find((item) => item.id === modelId);
    return group && model ? { provider: group.provider, model } : undefined;
}
function getPreferredProviderModelOption(groups, providerId, modelId) {
    const options = groups.flatMap((group) => group.models.map((model) => ({ provider: group.provider, model })));
    return (options.find((option) => option.provider.id === providerId && option.model.id === modelId) ??
        options.find((option) => option.provider.id === providerId) ??
        options[0]);
}
function getProviderModelSelectionLabel(option) {
    if (!option)
        return 'Not configured';
    return `${option.provider.name} - ${option.model.name}`;
}
function StepProgress({ currentIndex }) {
    return (_jsx("div", { className: "flex items-center gap-1.5", "aria-label": `Step ${currentIndex + 1} of ${SETUP_STEPS.length}`, children: SETUP_STEPS.map((setupStep, index) => (_jsx("span", { className: cn('h-1.5 rounded-full transition-all', index === currentIndex ? 'w-6 bg-primary' : 'w-1.5', index < currentIndex ? 'bg-primary' : 'bg-muted', index > currentIndex ? 'bg-muted' : undefined) }, setupStep))) }));
}
const StartPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('presentation');
    const [expandedModelAreaId, setExpandedModelAreaId] = useState(AGENTS.assistant);
    const [providerEntries, setProviderEntries] = useState(() => actionableProviderCatalog.map((provider, index) => ({
        providerId: provider.id,
        apiKey: '',
        apiKeySaved: false,
        editing: index === 0,
    })));
    const [savingProviderId, setSavingProviderId] = useState(null);
    const [providers, setProviders] = useState([]);
    const [configProvider, setConfigProvider] = useState('');
    const [savedModelId, setSavedModelId] = useState('');
    const [agentModelGroups, setAgentModelGroups] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [loadingModels, setLoadingModels] = useState(false);
    const [speechProviderId, setSpeechProviderId] = useState('');
    const [savedSpeechProviderId, setSavedSpeechProviderId] = useState('');
    const [savedSpeechModelId, setSavedSpeechModelId] = useState('');
    const [speechModelGroups, setSpeechModelGroups] = useState([]);
    const [selectedSpeechModel, setSelectedSpeechModel] = useState('');
    const [savedTextToSpeechService, setSavedTextToSpeechService] = useState();
    const [textToSpeechModelGroups, setTextToSpeechModelGroups] = useState([]);
    const [textToSpeechProviderId, setTextToSpeechProviderId] = useState('');
    const [selectedTextToSpeechModel, setSelectedTextToSpeechModel] = useState('');
    const [savedImageCreatorService, setSavedImageCreatorService] = useState();
    const [imageCreatorModelGroups, setImageCreatorModelGroups] = useState([]);
    const [imageCreatorProviderId, setImageCreatorProviderId] = useState('');
    const [selectedImageCreatorModel, setSelectedImageCreatorModel] = useState('');
    const [savedTextToVideoService, setSavedTextToVideoService] = useState();
    const [textToVideoModelGroups, setTextToVideoModelGroups] = useState([]);
    const [textToVideoProviderId, setTextToVideoProviderId] = useState('');
    const [selectedTextToVideoModel, setSelectedTextToVideoModel] = useState('');
    const [savedMusicCreatorService, setSavedMusicCreatorService] = useState();
    const [musicCreatorModelGroups, setMusicCreatorModelGroups] = useState([]);
    const [musicCreatorProviderId, setMusicCreatorProviderId] = useState('');
    const [selectedMusicCreatorModel, setSelectedMusicCreatorModel] = useState('');
    const [registeredProviderIds, setRegisteredProviderIds] = useState(() => new Set());
    const [savingConfig, setSavingConfig] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const assistantProviderItems = useMemo(() => getLlmProviderSelectItems(), []);
    const stepIndex = SETUP_STEPS.indexOf(step);
    const hasProviderDraft = providerEntries.some((entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0);
    const canContinueProviders = hasProviderDraft && !savingProviderId;
    const agentModelOptions = useMemo(() => agentModelGroups.flatMap((group) => {
        return group.models.map((model) => ({
            value: getAgentModelValue(group.provider.id, model.id),
            provider: group.provider,
            model,
        }));
    }), [agentModelGroups]);
    const selectedAgentModelValue = configProvider && selectedModel ? getAgentModelValue(configProvider, selectedModel) : '';
    const selectedAgentModels = configProvider ? getProviderLlmModels(configProvider) : [];
    const selectedAgentModel = selectedAgentModels.find((model) => model.id === selectedModel);
    const selectedAgentProvider = configProvider
        ? getLlmProvidersFromCatalog().find((provider) => provider.id === configProvider)
        : undefined;
    const selectedAgentModelOption = selectedAgentProvider && selectedAgentModel
        ? {
            value: selectedAgentModelValue,
            provider: selectedAgentProvider,
            model: selectedAgentModel,
        }
        : undefined;
    const selectedModelName = selectedAgentModelOption?.model.name ?? selectedModel;
    const modelCountLabel = loadingModels
        ? 'Loading models...'
        : agentModelOptions.length === 0
            ? 'No models available'
            : `${agentModelOptions.length} models available`;
    const canSaveModelSetup = selectedAgentModelOption !== undefined && !loadingModels && !savingConfig;
    const isBusy = savingProviderId !== null || savingConfig;
    const connectedProviderIds = useMemo(() => new Set(providerEntries.filter((entry) => entry.apiKeySaved).map((entry) => entry.providerId)), [providerEntries]);
    useEffect(() => {
        if (step !== 'providers')
            return;
        let cancelled = false;
        async function loadProviderApiKeyStatus() {
            const savedEntries = await Promise.all(actionableProviderCatalog.map(async (provider) => {
                try {
                    const stored = await getStoredProvider(provider.id);
                    return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0];
                }
                catch {
                    return [provider.id, false];
                }
            }));
            if (cancelled)
                return;
            const savedByProviderId = new Map(savedEntries);
            const hasSavedProvider = [...savedByProviderId.values()].some(Boolean);
            setProviderEntries((entries) => actionableProviderCatalog.map((provider, index) => {
                const current = entries.find((entry) => entry.providerId === provider.id);
                const draft = current?.apiKey ?? '';
                const hasDraft = draft.trim().length > 0;
                const saved = savedByProviderId.get(provider.id) ?? false;
                return {
                    providerId: provider.id,
                    apiKey: draft,
                    apiKeySaved: saved,
                    editing: hasDraft
                        ? (current?.editing ?? false)
                        : saved
                            ? false
                            : (current?.editing ?? (!hasSavedProvider && index === 0)),
                };
            }));
        }
        void loadProviderApiKeyStatus();
        return () => {
            cancelled = true;
        };
    }, [step]);
    useEffect(() => {
        if (step !== 'models')
            return;
        let cancelled = false;
        async function loadProviders() {
            try {
                const [storedAgentProvider, storedAgentModelId] = await Promise.all([
                    window.agent.getProvider(),
                    window.agent.getModelId(),
                ]);
                if (cancelled)
                    return;
                const savedProviderEntries = await Promise.all(assistantProviderItems.map(async (provider) => {
                    try {
                        const stored = await window.provider.get(provider.id);
                        return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0];
                    }
                    catch {
                        return [provider.id, false];
                    }
                }));
                if (cancelled)
                    return;
                const savedProviderIds = new Set(savedProviderEntries
                    .filter(([, hasApiKey]) => hasApiKey)
                    .map(([providerId]) => providerId));
                const draftProviderIds = new Set(providerEntries
                    .filter((entry) => entry.apiKey.trim().length > 0)
                    .map((entry) => entry.providerId));
                const selectableProviders = getLlmProvidersFromCatalog().filter((provider) => getProviderLlmModels(provider.id).length > 0);
                const preferredProvider = selectableProviders.find((provider) => provider.id === storedAgentProvider?.id) ??
                    selectableProviders.find((provider) => connectedProviderIds.has(provider.id) ||
                        savedProviderIds.has(provider.id) ||
                        draftProviderIds.has(provider.id)) ??
                    selectableProviders[0];
                setProviders(selectableProviders);
                setRegisteredProviderIds(savedProviderIds);
                setConfigProvider(preferredProvider?.id ?? '');
                setSavedModelId(storedAgentModelId ?? '');
                setSpeechProviderId('');
                setSavedSpeechProviderId('');
                setSavedSpeechModelId('');
                setSavedTextToSpeechService(undefined);
                setTextToSpeechProviderId('');
                setSavedImageCreatorService(undefined);
                setImageCreatorProviderId('');
                setSavedTextToVideoService(undefined);
                setTextToVideoProviderId('');
                setSavedMusicCreatorService(undefined);
                setMusicCreatorProviderId('');
            }
            catch (error) {
                if (cancelled)
                    return;
                setProviders([]);
                setRegisteredProviderIds(new Set());
                setConfigProvider('');
                setSavedModelId('');
                setSpeechProviderId('');
                setSavedSpeechProviderId('');
                setSavedSpeechModelId('');
                setSavedTextToSpeechService(undefined);
                setTextToSpeechProviderId('');
                setSavedImageCreatorService(undefined);
                setImageCreatorProviderId('');
                setSavedTextToVideoService(undefined);
                setTextToVideoProviderId('');
                setSavedMusicCreatorService(undefined);
                setMusicCreatorProviderId('');
                setErrorMessage(getErrorMessage(error, 'Could not load models.'));
            }
        }
        void loadProviders();
        return () => {
            cancelled = true;
        };
    }, [assistantProviderItems, connectedProviderIds, providerEntries, step]);
    useEffect(() => {
        if (step !== 'models')
            return;
        let cancelled = false;
        async function loadModels() {
            if (providers.length === 0) {
                setAgentModelGroups([]);
                setSpeechModelGroups([]);
                setTextToSpeechModelGroups([]);
                setImageCreatorModelGroups([]);
                setTextToVideoModelGroups([]);
                setMusicCreatorModelGroups([]);
                setSelectedModel('');
                setSpeechProviderId('');
                setSelectedSpeechModel('');
                setTextToSpeechProviderId('');
                setSelectedTextToSpeechModel('');
                setImageCreatorProviderId('');
                setSelectedImageCreatorModel('');
                setTextToVideoProviderId('');
                setSelectedTextToVideoModel('');
                setMusicCreatorProviderId('');
                setSelectedMusicCreatorModel('');
                return;
            }
            setLoadingModels(true);
            setErrorMessage('');
            try {
                const nextAgentGroups = [];
                const nextSpeechGroups = [];
                const nextTextToSpeechGroups = [];
                const nextImageCreatorGroups = [];
                const nextTextToVideoGroups = [];
                const nextMusicCreatorGroups = [];
                for (const provider of providers) {
                    const agentModels = getProviderLlmModels(provider.id);
                    if (agentModels.length > 0) {
                        nextAgentGroups.push({ provider, models: agentModels });
                    }
                }
                if (cancelled)
                    return;
                setAgentModelGroups(nextAgentGroups);
                setSpeechModelGroups(nextSpeechGroups);
                setTextToSpeechModelGroups(nextTextToSpeechGroups);
                setImageCreatorModelGroups(nextImageCreatorGroups);
                setTextToVideoModelGroups(nextTextToVideoGroups);
                setMusicCreatorModelGroups(nextMusicCreatorGroups);
                const agentOptions = nextAgentGroups.flatMap((group) => group.models.map((model) => ({ provider: group.provider, model })));
                const preferredAgentOption = agentOptions.find((option) => option.provider.id === configProvider && option.model.id === savedModelId) ??
                    agentOptions.find((option) => option.provider.id === configProvider) ??
                    agentOptions[0];
                setConfigProvider(preferredAgentOption?.provider.id ?? '');
                setSelectedModel(preferredAgentOption?.model.id ?? '');
                const speechOptions = nextSpeechGroups.flatMap((group) => group.models.map((model) => ({ provider: group.provider, model })));
                const preferredSpeechOption = speechOptions.find((option) => option.provider.id === savedSpeechProviderId && option.model.id === savedSpeechModelId) ??
                    speechOptions.find((option) => option.provider.id === savedSpeechProviderId) ??
                    speechOptions[0];
                setSpeechProviderId(preferredSpeechOption?.provider.id ?? '');
                setSelectedSpeechModel(preferredSpeechOption?.model.id ?? '');
                const preferredTextToSpeechOption = getPreferredProviderModelOption(nextTextToSpeechGroups, savedTextToSpeechService?.provider.id ?? '', savedTextToSpeechService?.model.id ?? '');
                setTextToSpeechProviderId(preferredTextToSpeechOption?.provider.id ?? '');
                setSelectedTextToSpeechModel(preferredTextToSpeechOption?.model.id ?? '');
                const preferredImageCreatorOption = getPreferredProviderModelOption(nextImageCreatorGroups, savedImageCreatorService?.provider.id ?? '', savedImageCreatorService?.model.id ?? '');
                setImageCreatorProviderId(preferredImageCreatorOption?.provider.id ?? '');
                setSelectedImageCreatorModel(preferredImageCreatorOption?.model.id ?? '');
                const preferredTextToVideoOption = getPreferredProviderModelOption(nextTextToVideoGroups, savedTextToVideoService?.provider.id ?? '', savedTextToVideoService?.model.id ?? '');
                setTextToVideoProviderId(preferredTextToVideoOption?.provider.id ?? '');
                setSelectedTextToVideoModel(preferredTextToVideoOption?.model.id ?? '');
                const preferredMusicCreatorOption = getPreferredProviderModelOption(nextMusicCreatorGroups, savedMusicCreatorService?.provider.id ?? '', savedMusicCreatorService?.model.id ?? '');
                setMusicCreatorProviderId(preferredMusicCreatorOption?.provider.id ?? '');
                setSelectedMusicCreatorModel(preferredMusicCreatorOption?.model.id ?? '');
            }
            catch (error) {
                if (cancelled)
                    return;
                setAgentModelGroups([]);
                setSpeechModelGroups([]);
                setTextToSpeechModelGroups([]);
                setImageCreatorModelGroups([]);
                setTextToVideoModelGroups([]);
                setMusicCreatorModelGroups([]);
                setSelectedModel('');
                setSpeechProviderId('');
                setSelectedSpeechModel('');
                setTextToSpeechProviderId('');
                setSelectedTextToSpeechModel('');
                setImageCreatorProviderId('');
                setSelectedImageCreatorModel('');
                setTextToVideoProviderId('');
                setSelectedTextToVideoModel('');
                setMusicCreatorProviderId('');
                setSelectedMusicCreatorModel('');
                setErrorMessage(getErrorMessage(error, 'Could not load models for this provider.'));
            }
            finally {
                if (!cancelled) {
                    setLoadingModels(false);
                }
            }
        }
        void loadModels();
        return () => {
            cancelled = true;
        };
    }, [
        configProvider,
        providers,
        savedImageCreatorService,
        savedModelId,
        savedMusicCreatorService,
        savedSpeechModelId,
        savedSpeechProviderId,
        savedTextToSpeechService,
        savedTextToVideoService,
        step,
    ]);
    function goToStep(nextStep) {
        setErrorMessage('');
        setStep(nextStep);
    }
    function handleBack() {
        const previousStep = SETUP_STEPS[Math.max(0, stepIndex - 1)];
        goToStep(previousStep);
    }
    function updateProviderEntry(providerId, patch) {
        setProviderEntries((entries) => entries.map((entry) => (entry.providerId === providerId ? { ...entry, ...patch } : entry)));
    }
    function handleProviderApiKeyChange(providerId, apiKey) {
        setErrorMessage('');
        updateProviderEntry(providerId, { apiKey });
    }
    async function saveProviderEntry(providerId) {
        const entry = providerEntries.find((item) => item.providerId === providerId);
        if (!entry)
            return false;
        const apiKey = entry.apiKey.trim();
        if (!apiKey) {
            setErrorMessage('Enter an API key before saving this provider.');
            return false;
        }
        setSavingProviderId(providerId);
        setErrorMessage('');
        try {
            const provider = toStoredProvider(providerId, apiKey);
            if (!provider)
                throw new Error('Unknown provider.');
            await saveStoredProvider(providerId, provider);
            updateProviderEntry(providerId, {
                apiKey: '',
                apiKeySaved: true,
                editing: false,
            });
            return true;
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, 'Could not save provider API key.'));
            return false;
        }
        finally {
            setSavingProviderId(null);
        }
    }
    async function handleContinueProviders() {
        if (!canContinueProviders)
            return;
        setSavingProviderId('all');
        setErrorMessage('');
        try {
            const entriesToSave = providerEntries.filter((entry) => entry.apiKey.trim().length > 0);
            if (entriesToSave.length > 0) {
                await Promise.all(entriesToSave.map((entry) => {
                    const provider = toStoredProvider(entry.providerId, entry.apiKey.trim());
                    if (!provider)
                        throw new Error(`Unknown provider: ${entry.providerId}`);
                    return saveStoredProvider(entry.providerId, provider);
                }));
                const savedProviderIds = new Set(entriesToSave.map((entry) => entry.providerId));
                setProviderEntries((entries) => entries.map((entry) => savedProviderIds.has(entry.providerId)
                    ? { ...entry, apiKey: '', apiKeySaved: true, editing: false }
                    : entry));
            }
            goToStep('models');
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, 'Could not save provider API keys.'));
        }
        finally {
            setSavingProviderId(null);
        }
    }
    function handleAgentProviderChange(value) {
        const providerId = value ?? '';
        setErrorMessage('');
        setConfigProvider(providerId);
        setSelectedModel(getProviderLlmModels(providerId)[0]?.id ?? '');
    }
    function handleAgentModelChange(value) {
        setErrorMessage('');
        setSelectedModel(value ?? '');
    }
    function handleSpeechProviderChange(value) {
        const providerId = value ?? '';
        const group = speechModelGroups.find((item) => item.provider.id === providerId);
        setErrorMessage('');
        setSpeechProviderId(providerId);
        setSelectedSpeechModel(group?.models[0]?.id ?? '');
    }
    function handleSpeechModelChange(value) {
        setErrorMessage('');
        setSelectedSpeechModel(value ?? '');
    }
    function handleTextToSpeechProviderChange(value) {
        const providerId = value ?? '';
        const group = textToSpeechModelGroups.find((item) => item.provider.id === providerId);
        setErrorMessage('');
        setTextToSpeechProviderId(providerId);
        setSelectedTextToSpeechModel(group?.models[0]?.id ?? '');
    }
    function handleTextToSpeechModelChange(value) {
        setErrorMessage('');
        setSelectedTextToSpeechModel(value ?? '');
    }
    function handleImageCreatorProviderChange(value) {
        const providerId = value ?? '';
        const group = imageCreatorModelGroups.find((item) => item.provider.id === providerId);
        setErrorMessage('');
        setImageCreatorProviderId(providerId);
        setSelectedImageCreatorModel(group?.models[0]?.id ?? '');
    }
    function handleImageCreatorModelChange(value) {
        setErrorMessage('');
        setSelectedImageCreatorModel(value ?? '');
    }
    function handleTextToVideoProviderChange(value) {
        const providerId = value ?? '';
        const group = textToVideoModelGroups.find((item) => item.provider.id === providerId);
        setErrorMessage('');
        setTextToVideoProviderId(providerId);
        setSelectedTextToVideoModel(group?.models[0]?.id ?? '');
    }
    function handleTextToVideoModelChange(value) {
        setErrorMessage('');
        setSelectedTextToVideoModel(value ?? '');
    }
    function handleMusicCreatorProviderChange(value) {
        const providerId = value ?? '';
        const group = musicCreatorModelGroups.find((item) => item.provider.id === providerId);
        setErrorMessage('');
        setMusicCreatorProviderId(providerId);
        setSelectedMusicCreatorModel(group?.models[0]?.id ?? '');
    }
    function handleMusicCreatorModelChange(value) {
        setErrorMessage('');
        setSelectedMusicCreatorModel(value ?? '');
    }
    function handleOpenProviderLink(provider) {
        if (!provider.apiConfigurationUrl)
            return;
        openExternalUrl(provider.apiConfigurationUrl);
    }
    async function handleSaveAgentModel() {
        if (!selectedAgentModelOption || !canSaveModelSetup)
            return;
        setSavingConfig(true);
        setErrorMessage('');
        try {
            await window.agent.setProvider(selectedAgentModelOption.provider);
            await window.agent.setModelId(selectedAgentModelOption.model.id);
            navigate('/home');
        }
        catch (error) {
            setErrorMessage(getErrorMessage(error, 'Could not save the selected assistant model.'));
        }
        finally {
            setSavingConfig(false);
        }
    }
    function handlePrimaryAction() {
        if (step === 'presentation') {
            goToStep('providers');
            return;
        }
        if (step === 'providers') {
            void handleContinueProviders();
            return;
        }
        if (step === 'models') {
            void handleSaveAgentModel();
            return;
        }
        navigate('/home');
    }
    function getPrimaryLabel() {
        if (step === 'presentation')
            return 'Get started';
        if (savingProviderId !== null || savingConfig)
            return 'Saving...';
        return 'Continue';
    }
    function isPrimaryDisabled() {
        if (step === 'providers')
            return !canContinueProviders;
        if (step === 'models')
            return !canSaveModelSetup;
        return isBusy;
    }
    function renderPresentationStep() {
        return (_jsxs("div", { className: "mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6", children: [_jsx(DomeWaveAnimation, { height: 120, className: "w-full max-w-sm" }), _jsxs(Badge, { variant: "secondary", className: "mt-5 h-6 rounded-md px-2.5 text-xs font-semibold", children: [_jsx(Check, { className: "size-3" }), "Setup takes about a minute"] }), _jsxs("h1", { className: "mt-5 text-3xl font-bold leading-none tracking-normal text-foreground", children: ["Welcome to ", PRODUCT_NAME] }), _jsxs("p", { className: "mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground", children: ["Connect an AI provider, choose the models ", PRODUCT_NAME, " should use, and review which model areas are ready now."] })] }));
    }
    function renderProviderStep() {
        return (_jsxs("div", { className: "mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold leading-tight tracking-normal text-foreground", children: "Connect your AI provider" }), _jsxs("p", { className: "mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground", children: ["Add one API key so ", PRODUCT_NAME, " can start answering your requests. Your key is saved locally in ", PRODUCT_NAME, "'s app data folder."] })] }), _jsx("div", { className: "mt-4 space-y-2", children: actionableProviderCatalog.map((provider) => {
                        const entry = providerEntries.find((item) => item.providerId === provider.id);
                        const connected = entry?.apiKeySaved ?? false;
                        const editing = entry?.editing ?? false;
                        const savingThisProvider = savingProviderId === provider.id || savingProviderId === 'all';
                        const canSaveProvider = !!entry && !savingThisProvider && entry.apiKey.trim().length > 0;
                        return (_jsx(Card, { className: cn('rounded-lg border-border bg-card py-0 shadow-none', editing && 'border-ring ring-2 ring-ring/20', !provider.supported && 'opacity-70'), children: _jsxs(CardContent, { className: "p-0", children: [_jsxs("div", { className: cn('grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5', editing && 'pb-2'), children: [_jsx(ProviderAvatar, { providerId: provider.id, name: provider.name }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx("h2", { className: "min-w-0 truncate text-sm font-semibold leading-tight text-foreground", children: provider.name }), _jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", className: "size-5 text-muted-foreground hover:text-foreground", "aria-label": `Open ${provider.name} API setup`, onClick: () => handleOpenProviderLink(provider), children: _jsx(ExternalLink, { className: "size-3" }) })] }), _jsx("p", { className: "truncate text-xs font-medium leading-tight text-muted-foreground", children: connected ? MASKED_API_KEY_LABEL : provider.capabilities })] }), _jsx("div", { className: "flex shrink-0 justify-end gap-2", children: provider.supported ? (connected && !editing ? (_jsx(Button, { type: "button", variant: "ghost", size: "icon-xs", "aria-label": `Edit ${provider.name} API key`, onClick: () => {
                                                        updateProviderEntry(provider.id, {
                                                            editing: true,
                                                            apiKey: '',
                                                        });
                                                    }, children: _jsx(Pencil, { className: "size-3.5" }) })) : editing ? null : (_jsx(Button, { type: "button", variant: "outline", size: "xs", onClick: () => {
                                                        updateProviderEntry(provider.id, { editing: true });
                                                    }, children: "Connect" }))) : (_jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: true, children: "Soon" })) })] }), provider.supported && editing && entry ? (_jsxs("div", { className: "flex items-center gap-2 px-3 pb-3", children: [_jsx(Input, { "aria-label": `${provider.name} API key`, autoComplete: "off", className: "h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground", disabled: savingThisProvider, onChange: (event) => {
                                                    handleProviderApiKeyChange(provider.id, event.target.value);
                                                }, placeholder: "API key", spellCheck: false, type: "password", value: entry.apiKey }), _jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: savingThisProvider, onClick: () => {
                                                    updateProviderEntry(provider.id, {
                                                        apiKey: '',
                                                        editing: false,
                                                    });
                                                }, children: "Cancel" }), _jsxs(Button, { type: "button", size: "sm", disabled: !canSaveProvider, onClick: () => {
                                                    void saveProviderEntry(provider.id);
                                                }, children: [savingThisProvider ? (_jsx(LoaderCircle, { className: "size-3.5 animate-spin" })) : null, "Save"] })] })) : null] }) }, provider.id));
                    }) }), _jsx("div", { className: "mt-auto pt-4", children: _jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground", children: [_jsx(KeyRound, { className: "size-4 shrink-0" }), _jsxs("p", { className: "text-xs font-medium leading-snug", children: ["Keys stay in ", PRODUCT_NAME, "'s local app data folder and are only used for providers you connect. You can revoke them anytime."] })] }) })] }));
    }
    function renderModelsStep() {
        const selectedSpeechGroup = speechModelGroups.find((group) => group.provider.id === speechProviderId);
        const selectedSpeechModels = selectedSpeechGroup?.models ?? [];
        const selectedSpeechOption = selectedSpeechModels.find((option) => option.id === selectedSpeechModel);
        const speechStatus = loadingModels
            ? 'Loading models...'
            : (selectedSpeechOption?.name ?? 'No transcription model');
        const selectedTextToSpeechGroup = textToSpeechModelGroups.find((group) => group.provider.id === textToSpeechProviderId);
        const selectedTextToSpeechModels = selectedTextToSpeechGroup?.models ?? [];
        const selectedImageCreatorGroup = imageCreatorModelGroups.find((group) => group.provider.id === imageCreatorProviderId);
        const selectedImageCreatorModels = selectedImageCreatorGroup?.models ?? [];
        const selectedTextToVideoGroup = textToVideoModelGroups.find((group) => group.provider.id === textToVideoProviderId);
        const selectedTextToVideoModels = selectedTextToVideoGroup?.models ?? [];
        const selectedMusicCreatorGroup = musicCreatorModelGroups.find((group) => group.provider.id === musicCreatorProviderId);
        const selectedMusicCreatorModels = selectedMusicCreatorGroup?.models ?? [];
        const ocrModelName = 'Not available yet';
        const toggleModelArea = (areaId) => {
            setExpandedModelAreaId((current) => (current === areaId ? AGENTS.assistant : areaId));
        };
        const renderProviderModelFields = ({ providerSelectId, modelSelectId, providerId, modelId, groups, models, providerLabel, modelLabel, placeholder, onProviderChange, onModelChange, }) => (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SettingsField, { id: providerSelectId, label: providerLabel, children: _jsxs(Select, { value: providerId, onValueChange: onProviderChange, disabled: loadingModels || groups.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: providerSelectId, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: placeholder }) }), _jsx(SelectContent, { children: groups.map((group) => {
                                    const catalog = getProviderCatalogItem(group.provider.id);
                                    return (_jsx(SelectItem, { value: group.provider.id, children: catalog.name }, group.provider.id));
                                }) })] }) }), _jsx(SettingsField, { id: modelSelectId, label: modelLabel, children: _jsxs(Select, { value: modelId, onValueChange: onModelChange, disabled: loadingModels || models.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: modelSelectId, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: placeholder }) }), _jsx(SelectContent, { children: models.map((model) => (_jsx(SelectItem, { value: model.id, children: model.name }, model.id))) })] }) })] }));
        const renderModelAreaPanel = (areaId, summary, children, disabled = false) => {
            const area = MODEL_AREAS.find((item) => item.id === areaId);
            if (!area)
                throw new Error(`Unknown model area: ${areaId}`);
            const Icon = area.icon;
            const expanded = !disabled && expandedModelAreaId === area.id;
            return (_jsxs(SettingsPanel, { children: [_jsxs(Item, { as: "button", type: "button", disabled: disabled, size: "md", "aria-expanded": expanded, "aria-controls": `model-area-${area.id}`, className: cn('text-left hover:bg-muted/30', expanded && 'border-b border-border/60', disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'), onClick: () => toggleModelArea(area.id), children: [_jsx(ItemMedia, { variant: "icon", children: _jsx(Icon, { className: "size-3", strokeWidth: 1.8 }) }), _jsxs(ItemContent, { className: "min-w-0 flex-1 flex-col items-start gap-0", children: [_jsx(ItemTitle, { children: area.title }), _jsx("p", { className: "mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground", children: summary })] }), _jsx(ItemActions, { className: "ml-auto flex-none justify-end", children: _jsx(ChevronDown, { className: cn('size-3 text-muted-foreground transition-transform', expanded && 'rotate-180'), strokeWidth: 1.8 }) })] }), expanded && (_jsxs("div", { id: `model-area-${area.id}`, className: "grid gap-3 p-3", children: [_jsx("p", { className: "text-[11px] leading-4 text-muted-foreground", children: area.purpose }), children] }))] }, area.id));
        };
        return (_jsxs("div", { className: "mx-auto w-full max-w-2xl px-4 py-8 sm:px-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold leading-tight tracking-normal text-foreground", children: "Configure models" }), _jsx("p", { className: "mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground", children: "Choose the active assistant model. The remaining model areas are disabled for this setup flow." })] }), _jsxs("div", { className: "mt-4 space-y-2", children: [renderModelAreaPanel(AGENTS.assistant, selectedModelName || modelCountLabel, _jsx(_Fragment, { children: _jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SettingsField, { id: MODEL_FIELD_IDS[AGENTS.assistant].provider, label: "Provider", children: _jsxs(Select, { value: configProvider, onValueChange: handleAgentProviderChange, disabled: assistantProviderItems.length === 0, children: [_jsx(SelectTrigger, { id: MODEL_FIELD_IDS[AGENTS.assistant].provider, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: modelCountLabel }) }), _jsx(SelectContent, { children: assistantProviderItems.map((provider) => {
                                                        const registered = registeredProviderIds.has(provider.id);
                                                        return (_jsxs(SelectItem, { value: provider.id, children: [_jsx("span", { className: "min-w-0 flex-1 truncate", children: provider.label }), _jsx("span", { className: cn('ml-auto shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium', registered
                                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                        : 'bg-muted text-muted-foreground'), children: registered ? 'API key saved' : 'No API key' })] }, provider.id));
                                                    }) })] }) }), _jsx(SettingsField, { id: MODEL_FIELD_IDS[AGENTS.assistant].model, label: "Model", children: _jsxs(Select, { value: selectedModel, onValueChange: handleAgentModelChange, disabled: loadingModels || selectedAgentModels.length === 0, children: [_jsx(SelectTrigger, { id: MODEL_FIELD_IDS[AGENTS.assistant].model, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: modelCountLabel }) }), _jsx(SelectContent, { children: selectedAgentModels.map((model) => (_jsx(SelectItem, { value: model.id, children: model.name }, model.id))) })] }) })] }) })), renderModelAreaPanel(AGENTS.speechToText, speechStatus, _jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SettingsField, { id: MODEL_FIELD_IDS[AGENTS.speechToText].provider, label: "Provider", children: _jsxs(Select, { value: speechProviderId, onValueChange: handleSpeechProviderChange, disabled: loadingModels || speechModelGroups.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: MODEL_FIELD_IDS[AGENTS.speechToText].provider, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: speechStatus }) }), _jsx(SelectContent, { children: speechModelGroups.map((group) => {
                                                            const catalog = getProviderCatalogItem(group.provider.id);
                                                            return (_jsx(SelectItem, { value: group.provider.id, children: catalog.name }, group.provider.id));
                                                        }) })] }) }), _jsx(SettingsField, { id: MODEL_FIELD_IDS[AGENTS.speechToText].model, label: "Transcription model", children: _jsxs(Select, { value: selectedSpeechModel, onValueChange: handleSpeechModelChange, disabled: loadingModels || selectedSpeechModels.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: MODEL_FIELD_IDS[AGENTS.speechToText].model, className: "w-full text-xs sm:w-72", children: _jsx(SelectValue, { placeholder: speechStatus }) }), _jsx(SelectContent, { children: selectedSpeechModels.map((option) => (_jsx(SelectItem, { value: option.id, children: option.name }, option.id))) })] }) })] }), speechModelGroups.length === 0 ? (_jsx(SettingsNotice, { icon: Mic, children: "Connect a speech-to-text capable provider to enable live transcription." })) : null] }), true), renderModelAreaPanel(AGENTS.textToSpeech, loadingModels
                            ? 'Loading models...'
                            : getProviderModelSelectionLabel(getProviderModelOption(textToSpeechModelGroups, textToSpeechProviderId, selectedTextToSpeechModel)), _jsx(_Fragment, { children: renderProviderModelFields({
                                providerSelectId: MODEL_FIELD_IDS[AGENTS.textToSpeech].provider,
                                modelSelectId: MODEL_FIELD_IDS[AGENTS.textToSpeech].model,
                                providerId: textToSpeechProviderId,
                                modelId: selectedTextToSpeechModel,
                                groups: textToSpeechModelGroups,
                                models: selectedTextToSpeechModels,
                                providerLabel: 'Provider',
                                modelLabel: 'Voice model',
                                placeholder: 'No voice model',
                                onProviderChange: handleTextToSpeechProviderChange,
                                onModelChange: handleTextToSpeechModelChange,
                            }) }), true), renderModelAreaPanel(AGENTS.textToImage, loadingModels
                            ? 'Loading models...'
                            : getProviderModelSelectionLabel(getProviderModelOption(imageCreatorModelGroups, imageCreatorProviderId, selectedImageCreatorModel)), _jsx(_Fragment, { children: renderProviderModelFields({
                                providerSelectId: MODEL_FIELD_IDS[AGENTS.textToImage].provider,
                                modelSelectId: MODEL_FIELD_IDS[AGENTS.textToImage].model,
                                providerId: imageCreatorProviderId,
                                modelId: selectedImageCreatorModel,
                                groups: imageCreatorModelGroups,
                                models: selectedImageCreatorModels,
                                providerLabel: 'Provider',
                                modelLabel: 'Image model',
                                placeholder: 'No image model',
                                onProviderChange: handleImageCreatorProviderChange,
                                onModelChange: handleImageCreatorModelChange,
                            }) }), true), renderModelAreaPanel(AGENTS.textToVideo, loadingModels
                            ? 'Loading models...'
                            : getProviderModelSelectionLabel(getProviderModelOption(textToVideoModelGroups, textToVideoProviderId, selectedTextToVideoModel)), _jsx(_Fragment, { children: renderProviderModelFields({
                                providerSelectId: MODEL_FIELD_IDS[AGENTS.textToVideo].provider,
                                modelSelectId: MODEL_FIELD_IDS[AGENTS.textToVideo].model,
                                providerId: textToVideoProviderId,
                                modelId: selectedTextToVideoModel,
                                groups: textToVideoModelGroups,
                                models: selectedTextToVideoModels,
                                providerLabel: 'Provider',
                                modelLabel: 'Video model',
                                placeholder: 'No video model',
                                onProviderChange: handleTextToVideoProviderChange,
                                onModelChange: handleTextToVideoModelChange,
                            }) }), true), renderModelAreaPanel(AGENTS.textToAudio, loadingModels
                            ? 'Loading models...'
                            : getProviderModelSelectionLabel(getProviderModelOption(musicCreatorModelGroups, musicCreatorProviderId, selectedMusicCreatorModel)), _jsx(_Fragment, { children: renderProviderModelFields({
                                providerSelectId: MODEL_FIELD_IDS[AGENTS.textToAudio].provider,
                                modelSelectId: MODEL_FIELD_IDS[AGENTS.textToAudio].model,
                                providerId: musicCreatorProviderId,
                                modelId: selectedMusicCreatorModel,
                                groups: musicCreatorModelGroups,
                                models: selectedMusicCreatorModels,
                                providerLabel: 'Provider',
                                modelLabel: 'Audio model',
                                placeholder: 'No audio model',
                                onProviderChange: handleMusicCreatorProviderChange,
                                onModelChange: handleMusicCreatorModelChange,
                            }) }), true), renderModelAreaPanel(AGENTS.documentReader, 'Document reading', _jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(SettingsField, { id: "ocr-endpoint", label: "Current path", children: _jsx("div", { className: "min-h-8 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground", children: "ocr.run endpoint" }) }), _jsx(SettingsField, { id: "ocr-model", label: "Provider model", children: _jsx("div", { className: "min-h-8 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground", children: ocrModelName }) })] }), _jsx(SettingsNotice, { icon: FileSearch, children: "OCR provider and model setup will appear here when document reading uses provider models." })] }), true), renderModelAreaPanel(AGENTS.embedding, 'Semantic indexing', _jsx(_Fragment, { children: _jsx(SettingsNotice, { icon: Database, children: "Embedding provider and model setup will appear here when semantic indexing is implemented." }) }), true)] })] }));
    }
    function renderStepContent() {
        if (step === 'presentation')
            return renderPresentationStep();
        if (step === 'providers')
            return renderProviderStep();
        return renderModelsStep();
    }
    return (_jsxs("main", { className: "flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground", children: [_jsx("header", { className: "pointer-events-none fixed inset-x-0 top-12 z-40 px-4 py-3 sm:px-6", children: _jsx("nav", { "aria-label": "Setup navigation", className: "mx-auto flex w-full max-w-2xl items-center justify-end", children: _jsx(Button, { type: "button", variant: "ghost", size: "xs", className: "pointer-events-auto", onClick: () => navigate('/home'), children: "Skip" }) }) }), _jsxs("section", { className: "min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 sm:px-6", children: [renderStepContent(), errorMessage ? (_jsxs("div", { className: "mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-destructive", children: [_jsx(AlertCircle, { className: "mt-0.5 size-3.5 shrink-0" }), _jsx("p", { className: "min-w-0 break-words text-xs font-medium leading-4", children: errorMessage })] })) : null] }), _jsxs("footer", { className: "flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2 sm:px-5", children: [_jsxs("div", { className: "flex min-w-0 flex-wrap items-center gap-2 sm:gap-3", children: [_jsx(StepProgress, { currentIndex: stepIndex }), _jsx("p", { className: "truncate text-xs font-semibold text-muted-foreground", children: STEP_TITLES[step] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [step !== 'presentation' ? (_jsx(Button, { type: "button", variant: "outline", size: "xs", disabled: isBusy, onClick: handleBack, children: "Back" })) : null, _jsxs(Button, { type: "button", size: "sm", disabled: isPrimaryDisabled(), onClick: handlePrimaryAction, children: [savingProviderId !== null || savingConfig ? (_jsx(LoaderCircle, { className: "size-3.5 animate-spin" })) : (_jsx(ArrowRight, { className: "size-3.5" })), getPrimaryLabel()] })] })] })] }));
};
export default StartPage;
