import React, { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	Bot,
	ChevronDown,
	Check,
	Database,
	ExternalLink,
	FileSearch,
	ImageIcon,
	KeyRound,
	LoaderCircle,
	Mic,
	Music,
	Pencil,
	Video,
	Volume2,
	type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	getProviderApiConfigurationUrl,
	type PublicProvider,
} from '../../../../shared';
import type { Provider as StoredProvider } from '../../../../shared/providers.types';
import { LLM_MODELS_BY_PROVIDER, LLM_PROVIDERS } from '../../../../shared/provider_models_llm.definitions';
import { AGENTS, type AgentId } from '@/lib/compat';
import type { Model, ModelSelection } from '@/lib/compat';
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SettingsField, SettingsNotice, SettingsPanel } from '../settings/components';
import { openExternalUrl } from '@/lib/external-links';
import { cn } from '@/lib/utils';

type ProviderOption = {
	label: string;
	value: string;
};

type CatalogProvider = (typeof DEFAULT_PROVIDERS)[number];

type ProviderSetupEntry = {
	providerId: string;
	apiKey: string;
	apiKeySaved: boolean;
	editing: boolean;
};

type SetupStep = 'presentation' | 'providers' | 'models';

type ProviderCatalogItem = {
	id: string;
	name: string;
	capabilities: string;
	supported: boolean;
	apiConfigurationUrl?: string;
};

type ProviderModelGroup = {
	provider: PublicProvider;
	models: Model[];
};

type ProviderModelOption = {
	provider: PublicProvider;
	model: Model;
};

type AssistantProviderSelectItem = {
	id: string;
	label: string;
};

type AgentModelOption = {
	value: string;
	provider: PublicProvider;
	model: Model;
};

type ModelAreaDefinition = {
	id: ModelAreaId;
	title: string;
	purpose: string;
	icon: LucideIcon;
};

const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY_LABEL = 'sk-************' as const;
const AGENT_MODEL_VALUE_SEPARATOR = '::';
const SETUP_STEPS: readonly SetupStep[] = ['presentation', 'providers', 'models'];
const MODEL_AREA_IDS = [
	AGENTS.assistant,
	AGENTS.speechToText,
	AGENTS.textToSpeech,
	AGENTS.textToImage,
	AGENTS.textToVideo,
	AGENTS.textToAudio,
	AGENTS.documentReader,
	AGENTS.embedding,
] as const satisfies readonly AgentId[];
type ModelAreaId = (typeof MODEL_AREA_IDS)[number];

const STEP_TITLES: Record<SetupStep, string> = {
	presentation: 'Presentation',
	providers: 'Provider setup',
	models: 'Configure models',
};

const MODEL_AREAS: readonly ModelAreaDefinition[] = [
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
} as const satisfies Partial<Record<ModelAreaId, { provider: string; model: string }>>;

function normalizeProvider(provider: CatalogProvider, index: number): ProviderOption {
	const value = provider.id || `provider-${index}`;
	const label = provider.name || value;
	return { label, value };
}

const providerOptions = DEFAULT_PROVIDERS.map((provider, index) =>
	normalizeProvider(provider, index)
);
const supportedProviderIds = new Set(providerOptions.map((provider) => provider.value));
const actionableProviderCatalog: readonly ProviderCatalogItem[] = DEFAULT_PROVIDERS.map(
	(provider) => ({
		id: provider.id,
		name: provider.name,
		capabilities: provider.capabilities ?? 'AI provider',
		supported: true,
		apiConfigurationUrl: getProviderApiConfigurationUrl(provider),
	})
);

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}
	return fallback;
}

function getProviderCatalogItem(providerId: string): ProviderCatalogItem {
	return (
		actionableProviderCatalog.find((provider) => provider.id === providerId) ?? {
			id: providerId,
			name: providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId,
			capabilities: 'Chat',
			supported: supportedProviderIds.has(providerId),
		}
	);
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

function getCatalogProviderById(providerId: string): CatalogProvider | undefined {
	const providersById = new Map(DEFAULT_PROVIDERS.map((provider) => [provider.id, provider]));
	return providersById.get(providerId);
}

function toStoredProvider(providerId: string, apiKey: string): StoredProvider | undefined {
	const provider = getCatalogProviderById(providerId);
	if (!provider) return undefined;
	return {
		name: provider.name,
		apiKey,
		baseUrl: provider.baseUrl,
	};
}

function getStoredProvider(providerId: string): Promise<StoredProvider | undefined> {
	return window.provider.get(providerId);
}

function saveStoredProvider(providerId: string, provider: StoredProvider): Promise<StoredProvider> {
	return window.provider.set(providerId, provider);
}

function getLlmProvidersFromCatalog(): PublicProvider[] {
	return LLM_PROVIDERS.flatMap((providerId) => {
		const provider = getCatalogProviderById(providerId);
		return provider ? [toPublicProvider(provider)] : [];
	});
}

function getLlmProviderSelectItems(): AssistantProviderSelectItem[] {
	return LLM_PROVIDERS.flatMap((providerId) => {
		const provider = getCatalogProviderById(providerId);
		return provider ? [{ id: provider.id, label: provider.name }] : [];
	});
}

function getProviderLlmModels(providerId: string): Model[] {
	return [...(LLM_MODELS_BY_PROVIDER[providerId] ?? [])];
}

function getAgentModelValue(providerId: string, modelId: string): string {
	return `${providerId}${AGENT_MODEL_VALUE_SEPARATOR}${modelId}`;
}

function getProviderModelOption(
	groups: readonly ProviderModelGroup[],
	providerId: string,
	modelId: string
): ProviderModelOption | undefined {
	const group = groups.find((item) => item.provider.id === providerId);
	const model = group?.models.find((item) => item.id === modelId);
	return group && model ? { provider: group.provider, model } : undefined;
}

function getPreferredProviderModelOption(
	groups: readonly ProviderModelGroup[],
	providerId: string,
	modelId: string
): ProviderModelOption | undefined {
	const options = groups.flatMap((group) =>
		group.models.map((model) => ({ provider: group.provider, model }))
	);
	return (
		options.find((option) => option.provider.id === providerId && option.model.id === modelId) ??
		options.find((option) => option.provider.id === providerId) ??
		options[0]
	);
}

function getProviderModelSelectionLabel(option: ProviderModelOption | undefined): string {
	if (!option) return 'Not configured';
	return `${option.provider.name} - ${option.model.name}`;
}

function StepProgress({ currentIndex }: { readonly currentIndex: number }): React.JSX.Element {
	return (
		<div
			className="flex items-center gap-1.5"
			aria-label={`Step ${currentIndex + 1} of ${SETUP_STEPS.length}`}
		>
			{SETUP_STEPS.map((setupStep, index) => (
				<span
					key={setupStep}
					className={cn(
						'h-1.5 rounded-full transition-all',
						index === currentIndex ? 'w-6 bg-primary' : 'w-1.5',
						index < currentIndex ? 'bg-primary' : 'bg-muted',
						index > currentIndex ? 'bg-muted' : undefined
					)}
				/>
			))}
		</div>
	);
}

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [step, setStep] = useState<SetupStep>('presentation');
	const [expandedModelAreaId, setExpandedModelAreaId] = useState<ModelAreaId>(AGENTS.assistant);
	const [providerEntries, setProviderEntries] = useState<ProviderSetupEntry[]>(() =>
		actionableProviderCatalog.map((provider, index) => ({
			providerId: provider.id,
			apiKey: '',
			apiKeySaved: false,
			editing: index === 0,
		}))
	);
	const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [configProvider, setConfigProvider] = useState('');
	const [savedModelId, setSavedModelId] = useState('');
	const [agentModelGroups, setAgentModelGroups] = useState<ProviderModelGroup[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);
	const [speechProviderId, setSpeechProviderId] = useState('');
	const [savedSpeechProviderId, setSavedSpeechProviderId] = useState('');
	const [savedSpeechModelId, setSavedSpeechModelId] = useState('');
	const [speechModelGroups, setSpeechModelGroups] = useState<ProviderModelGroup[]>([]);
	const [selectedSpeechModel, setSelectedSpeechModel] = useState('');
	const [savedTextToSpeechService, setSavedTextToSpeechService] = useState<ModelSelection>();
	const [textToSpeechModelGroups, setTextToSpeechModelGroups] = useState<ProviderModelGroup[]>([]);
	const [textToSpeechProviderId, setTextToSpeechProviderId] = useState('');
	const [selectedTextToSpeechModel, setSelectedTextToSpeechModel] = useState('');
	const [savedImageCreatorService, setSavedImageCreatorService] = useState<ModelSelection>();
	const [imageCreatorModelGroups, setImageCreatorModelGroups] = useState<ProviderModelGroup[]>([]);
	const [imageCreatorProviderId, setImageCreatorProviderId] = useState('');
	const [selectedImageCreatorModel, setSelectedImageCreatorModel] = useState('');
	const [savedTextToVideoService, setSavedTextToVideoService] = useState<ModelSelection>();
	const [textToVideoModelGroups, setTextToVideoModelGroups] = useState<ProviderModelGroup[]>([]);
	const [textToVideoProviderId, setTextToVideoProviderId] = useState('');
	const [selectedTextToVideoModel, setSelectedTextToVideoModel] = useState('');
	const [savedMusicCreatorService, setSavedMusicCreatorService] = useState<ModelSelection>();
	const [musicCreatorModelGroups, setMusicCreatorModelGroups] = useState<ProviderModelGroup[]>([]);
	const [musicCreatorProviderId, setMusicCreatorProviderId] = useState('');
	const [selectedMusicCreatorModel, setSelectedMusicCreatorModel] = useState('');
	const [registeredProviderIds, setRegisteredProviderIds] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const assistantProviderItems = useMemo(() => getLlmProviderSelectItems(), []);

	const stepIndex = SETUP_STEPS.indexOf(step);
	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && !savingProviderId;
	const agentModelOptions = useMemo<AgentModelOption[]>(
		() =>
			agentModelGroups.flatMap((group) => {
				return group.models.map((model) => ({
					value: getAgentModelValue(group.provider.id, model.id),
					provider: group.provider,
					model,
				}));
			}),
		[agentModelGroups]
	);
	const selectedAgentModelValue =
		configProvider && selectedModel ? getAgentModelValue(configProvider, selectedModel) : '';
	const selectedAgentModels = configProvider ? getProviderLlmModels(configProvider) : [];
	const selectedAgentModel = selectedAgentModels.find((model) => model.id === selectedModel);
	const selectedAgentProvider = configProvider
		? getLlmProvidersFromCatalog().find((provider) => provider.id === configProvider)
		: undefined;
	const selectedAgentModelOption =
		selectedAgentProvider && selectedAgentModel
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
	const canSaveModelSetup =
		selectedAgentModelOption !== undefined && !loadingModels && !savingConfig;
	const isBusy = savingProviderId !== null || savingConfig;
	const connectedProviderIds = useMemo(
		() =>
			new Set(
				providerEntries.filter((entry) => entry.apiKeySaved).map((entry) => entry.providerId)
			),
		[providerEntries]
	);

	useEffect(() => {
		if (step !== 'providers') return;
		let cancelled = false;

		async function loadProviderApiKeyStatus(): Promise<void> {
			const savedEntries = await Promise.all(
				actionableProviderCatalog.map(async (provider) => {
					try {
						const stored = await getStoredProvider(provider.id);
						return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0] as const;
					} catch {
						return [provider.id, false] as const;
					}
				})
			);
			if (cancelled) return;

			const savedByProviderId = new Map(savedEntries);
			const hasSavedProvider = [...savedByProviderId.values()].some(Boolean);
			setProviderEntries((entries) =>
				actionableProviderCatalog.map((provider, index) => {
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
				})
			);
		}

		void loadProviderApiKeyStatus();
		return () => {
			cancelled = true;
		};
	}, [step]);

	useEffect(() => {
		if (step !== 'models') return;

		let cancelled = false;

		async function loadProviders(): Promise<void> {
			try {
				const [storedAgentProvider, storedAgentModelId] = await Promise.all([
					window.agent.getProvider(),
					window.agent.getModelId(),
				]);
				if (cancelled) return;

				const savedProviderEntries = await Promise.all(
					assistantProviderItems.map(async (provider) => {
						try {
							const stored = await window.provider.get(provider.id);
							return [provider.id, (stored?.apiKey.trim().length ?? 0) > 0] as const;
						} catch {
							return [provider.id, false] as const;
						}
					})
				);
				if (cancelled) return;

				const savedProviderIds = new Set(
					savedProviderEntries
						.filter(([, hasApiKey]) => hasApiKey)
						.map(([providerId]) => providerId)
				);
				const draftProviderIds = new Set(
					providerEntries
						.filter((entry) => entry.apiKey.trim().length > 0)
						.map((entry) => entry.providerId)
				);
				const selectableProviders = getLlmProvidersFromCatalog().filter(
					(provider) => getProviderLlmModels(provider.id).length > 0
				);
				const preferredProvider =
					selectableProviders.find((provider) => provider.id === storedAgentProvider?.id) ??
					selectableProviders.find(
						(provider) =>
							connectedProviderIds.has(provider.id) ||
							savedProviderIds.has(provider.id) ||
							draftProviderIds.has(provider.id)
					) ??
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
			} catch (error) {
				if (cancelled) return;
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
		if (step !== 'models') return;

		let cancelled = false;

		async function loadModels(): Promise<void> {
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
				const nextAgentGroups: ProviderModelGroup[] = [];
				const nextSpeechGroups: ProviderModelGroup[] = [];
				const nextTextToSpeechGroups: ProviderModelGroup[] = [];
				const nextImageCreatorGroups: ProviderModelGroup[] = [];
				const nextTextToVideoGroups: ProviderModelGroup[] = [];
				const nextMusicCreatorGroups: ProviderModelGroup[] = [];

				for (const provider of providers) {
					const agentModels = getProviderLlmModels(provider.id);
					if (agentModels.length > 0) {
						nextAgentGroups.push({ provider, models: agentModels });
					}
				}

				if (cancelled) return;

				setAgentModelGroups(nextAgentGroups);
				setSpeechModelGroups(nextSpeechGroups);
				setTextToSpeechModelGroups(nextTextToSpeechGroups);
				setImageCreatorModelGroups(nextImageCreatorGroups);
				setTextToVideoModelGroups(nextTextToVideoGroups);
				setMusicCreatorModelGroups(nextMusicCreatorGroups);

				const agentOptions = nextAgentGroups.flatMap((group) =>
					group.models.map((model) => ({ provider: group.provider, model }))
				);
				const preferredAgentOption =
					agentOptions.find(
						(option) => option.provider.id === configProvider && option.model.id === savedModelId
					) ??
					agentOptions.find((option) => option.provider.id === configProvider) ??
					agentOptions[0];

				setConfigProvider(preferredAgentOption?.provider.id ?? '');
				setSelectedModel(preferredAgentOption?.model.id ?? '');

				const speechOptions = nextSpeechGroups.flatMap((group) =>
					group.models.map((model) => ({ provider: group.provider, model }))
				);
				const preferredSpeechOption =
					speechOptions.find(
						(option) =>
							option.provider.id === savedSpeechProviderId && option.model.id === savedSpeechModelId
					) ??
					speechOptions.find((option) => option.provider.id === savedSpeechProviderId) ??
					speechOptions[0];

				setSpeechProviderId(preferredSpeechOption?.provider.id ?? '');
				setSelectedSpeechModel(preferredSpeechOption?.model.id ?? '');

				const preferredTextToSpeechOption = getPreferredProviderModelOption(
					nextTextToSpeechGroups,
					savedTextToSpeechService?.provider.id ?? '',
					savedTextToSpeechService?.model.id ?? ''
				);
				setTextToSpeechProviderId(preferredTextToSpeechOption?.provider.id ?? '');
				setSelectedTextToSpeechModel(preferredTextToSpeechOption?.model.id ?? '');

				const preferredImageCreatorOption = getPreferredProviderModelOption(
					nextImageCreatorGroups,
					savedImageCreatorService?.provider.id ?? '',
					savedImageCreatorService?.model.id ?? ''
				);
				setImageCreatorProviderId(preferredImageCreatorOption?.provider.id ?? '');
				setSelectedImageCreatorModel(preferredImageCreatorOption?.model.id ?? '');

				const preferredTextToVideoOption = getPreferredProviderModelOption(
					nextTextToVideoGroups,
					savedTextToVideoService?.provider.id ?? '',
					savedTextToVideoService?.model.id ?? ''
				);
				setTextToVideoProviderId(preferredTextToVideoOption?.provider.id ?? '');
				setSelectedTextToVideoModel(preferredTextToVideoOption?.model.id ?? '');

				const preferredMusicCreatorOption = getPreferredProviderModelOption(
					nextMusicCreatorGroups,
					savedMusicCreatorService?.provider.id ?? '',
					savedMusicCreatorService?.model.id ?? ''
				);
				setMusicCreatorProviderId(preferredMusicCreatorOption?.provider.id ?? '');
				setSelectedMusicCreatorModel(preferredMusicCreatorOption?.model.id ?? '');
			} catch (error) {
				if (cancelled) return;
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
			} finally {
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

	function goToStep(nextStep: SetupStep): void {
		setErrorMessage('');
		setStep(nextStep);
	}

	function handleBack(): void {
		const previousStep = SETUP_STEPS[Math.max(0, stepIndex - 1)];
		goToStep(previousStep);
	}

	function updateProviderEntry(providerId: string, patch: Partial<ProviderSetupEntry>): void {
		setProviderEntries((entries) =>
			entries.map((entry) => (entry.providerId === providerId ? { ...entry, ...patch } : entry))
		);
	}

	function handleProviderApiKeyChange(providerId: string, apiKey: string): void {
		setErrorMessage('');
		updateProviderEntry(providerId, { apiKey });
	}

	async function saveProviderEntry(providerId: string): Promise<boolean> {
		const entry = providerEntries.find((item) => item.providerId === providerId);
		if (!entry) return false;

		const apiKey = entry.apiKey.trim();
		if (!apiKey) {
			setErrorMessage('Enter an API key before saving this provider.');
			return false;
		}

		setSavingProviderId(providerId);
		setErrorMessage('');
		try {
			const provider = toStoredProvider(providerId, apiKey);
			if (!provider) throw new Error('Unknown provider.');
			await saveStoredProvider(providerId, provider);
			updateProviderEntry(providerId, {
				apiKey: '',
				apiKeySaved: true,
				editing: false,
			});
			return true;
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save provider API key.'));
			return false;
		} finally {
			setSavingProviderId(null);
		}
	}

	async function handleContinueProviders(): Promise<void> {
		if (!canContinueProviders) return;

		setSavingProviderId('all');
		setErrorMessage('');
		try {
			const entriesToSave = providerEntries.filter((entry) => entry.apiKey.trim().length > 0);

			if (entriesToSave.length > 0) {
				await Promise.all(
					entriesToSave.map((entry) => {
						const provider = toStoredProvider(entry.providerId, entry.apiKey.trim());
						if (!provider) throw new Error(`Unknown provider: ${entry.providerId}`);
						return saveStoredProvider(entry.providerId, provider);
					})
				);
				const savedProviderIds = new Set(entriesToSave.map((entry) => entry.providerId));
				setProviderEntries((entries) =>
					entries.map((entry) =>
						savedProviderIds.has(entry.providerId)
							? { ...entry, apiKey: '', apiKeySaved: true, editing: false }
							: entry
					)
				);
			}

			goToStep('models');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save provider API keys.'));
		} finally {
			setSavingProviderId(null);
		}
	}

	function handleAgentProviderChange(value: string | null): void {
		const providerId = value ?? '';
		setErrorMessage('');
		setConfigProvider(providerId);
		setSelectedModel(getProviderLlmModels(providerId)[0]?.id ?? '');
	}

	function handleAgentModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedModel(value ?? '');
	}

	function handleSpeechProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const group = speechModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setSpeechProviderId(providerId);
		setSelectedSpeechModel(group?.models[0]?.id ?? '');
	}

	function handleSpeechModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedSpeechModel(value ?? '');
	}

	function handleTextToSpeechProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const group = textToSpeechModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setTextToSpeechProviderId(providerId);
		setSelectedTextToSpeechModel(group?.models[0]?.id ?? '');
	}

	function handleTextToSpeechModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedTextToSpeechModel(value ?? '');
	}

	function handleImageCreatorProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const group = imageCreatorModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setImageCreatorProviderId(providerId);
		setSelectedImageCreatorModel(group?.models[0]?.id ?? '');
	}

	function handleImageCreatorModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedImageCreatorModel(value ?? '');
	}

	function handleTextToVideoProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const group = textToVideoModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setTextToVideoProviderId(providerId);
		setSelectedTextToVideoModel(group?.models[0]?.id ?? '');
	}

	function handleTextToVideoModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedTextToVideoModel(value ?? '');
	}

	function handleMusicCreatorProviderChange(value: string | null): void {
		const providerId = value ?? '';
		const group = musicCreatorModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setMusicCreatorProviderId(providerId);
		setSelectedMusicCreatorModel(group?.models[0]?.id ?? '');
	}

	function handleMusicCreatorModelChange(value: string | null): void {
		setErrorMessage('');
		setSelectedMusicCreatorModel(value ?? '');
	}

	function handleOpenProviderLink(provider: ProviderCatalogItem): void {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	}

	async function handleSaveAgentModel(): Promise<void> {
		if (!selectedAgentModelOption || !canSaveModelSetup) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.agent.setProvider(selectedAgentModelOption.provider);
			await window.agent.setModelId(selectedAgentModelOption.model.id);
			navigate('/home');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the selected assistant model.'));
		} finally {
			setSavingConfig(false);
		}
	}

	function handlePrimaryAction(): void {
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

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';
		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (step === 'models') return !canSaveModelSetup;
		return isBusy;
	}

	function renderPresentationStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
				<DomeWaveAnimation height={120} className="w-full max-w-sm" />
				<Badge variant="secondary" className="mt-5 h-6 rounded-md px-2.5 text-xs font-semibold">
					<Check className="size-3" />
					Setup takes about a minute
				</Badge>
				<h1 className="mt-5 text-3xl font-bold leading-none tracking-normal text-foreground">
					Welcome to {PRODUCT_NAME}
				</h1>
				<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
					Connect an AI provider, choose the models {PRODUCT_NAME} should use, and review which
					model areas are ready now.
				</p>
			</div>
		);
	}

	function renderProviderStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Connect your AI provider
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Add one API key so {PRODUCT_NAME} can start answering your requests. Your key is saved
						locally in {PRODUCT_NAME}&apos;s app data folder.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					{actionableProviderCatalog.map((provider) => {
						const entry = providerEntries.find((item) => item.providerId === provider.id);
						const connected = entry?.apiKeySaved ?? false;
						const editing = entry?.editing ?? false;
						const savingThisProvider =
							savingProviderId === provider.id || savingProviderId === 'all';
						const canSaveProvider =
							!!entry && !savingThisProvider && entry.apiKey.trim().length > 0;

						return (
							<Card
								key={provider.id}
								className={cn(
									'rounded-lg border-border bg-card py-0 shadow-none',
									editing && 'border-ring ring-2 ring-ring/20',
									!provider.supported && 'opacity-70'
								)}
							>
								<CardContent className="p-0">
									<div
										className={cn(
											'grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5',
											editing && 'pb-2'
										)}
									>
										<ProviderAvatar providerId={provider.id} name={provider.name} />
										<div className="min-w-0 flex-1">
											<div className="flex min-w-0 items-center gap-1.5">
												<h2 className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
													{provider.name}
												</h2>
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													className="size-5 text-muted-foreground hover:text-foreground"
													aria-label={`Open ${provider.name} API setup`}
													onClick={() => handleOpenProviderLink(provider)}
												>
													<ExternalLink className="size-3" />
												</Button>
											</div>
											<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
												{connected ? MASKED_API_KEY_LABEL : provider.capabilities}
											</p>
										</div>
										<div className="flex shrink-0 justify-end gap-2">
											{provider.supported ? (
												connected && !editing ? (
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														aria-label={`Edit ${provider.name} API key`}
														onClick={() => {
															updateProviderEntry(provider.id, {
																editing: true,
																apiKey: '',
															});
														}}
													>
														<Pencil className="size-3.5" />
													</Button>
												) : editing ? null : (
													<Button
														type="button"
														variant="outline"
														size="xs"
														onClick={() => {
															updateProviderEntry(provider.id, { editing: true });
														}}
													>
														Connect
													</Button>
												)
											) : (
												<Button type="button" variant="outline" size="xs" disabled>
													Soon
												</Button>
											)}
										</div>
									</div>

									{provider.supported && editing && entry ? (
										<div className="flex items-center gap-2 px-3 pb-3">
											<Input
												aria-label={`${provider.name} API key`}
												autoComplete="off"
												className="h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground"
												disabled={savingThisProvider}
												onChange={(event) => {
													handleProviderApiKeyChange(provider.id, event.target.value);
												}}
												placeholder="API key"
												spellCheck={false}
												type="password"
												value={entry.apiKey}
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={savingThisProvider}
												onClick={() => {
													updateProviderEntry(provider.id, {
														apiKey: '',
														editing: false,
													});
												}}
											>
												Cancel
											</Button>
											<Button
												type="button"
												size="sm"
												disabled={!canSaveProvider}
												onClick={() => {
													void saveProviderEntry(provider.id);
												}}
											>
												{savingThisProvider ? (
													<LoaderCircle className="size-3.5 animate-spin" />
												) : null}
												Save
											</Button>
										</div>
									) : null}
								</CardContent>
							</Card>
						);
					})}
				</div>

				<div className="mt-auto pt-4">
					<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
						<KeyRound className="size-4 shrink-0" />
						<p className="text-xs font-medium leading-snug">
							Keys stay in {PRODUCT_NAME}&apos;s local app data folder and are only used for
							providers you connect. You can revoke them anytime.
						</p>
					</div>
				</div>
			</div>
		);
	}

	function renderModelsStep(): React.JSX.Element {
		const selectedSpeechGroup = speechModelGroups.find(
			(group) => group.provider.id === speechProviderId
		);
		const selectedSpeechModels = selectedSpeechGroup?.models ?? [];
		const selectedSpeechOption = selectedSpeechModels.find(
			(option) => option.id === selectedSpeechModel
		);
		const speechStatus = loadingModels
			? 'Loading models...'
			: (selectedSpeechOption?.name ?? 'No transcription model');
		const selectedTextToSpeechGroup = textToSpeechModelGroups.find(
			(group) => group.provider.id === textToSpeechProviderId
		);
		const selectedTextToSpeechModels = selectedTextToSpeechGroup?.models ?? [];
		const selectedImageCreatorGroup = imageCreatorModelGroups.find(
			(group) => group.provider.id === imageCreatorProviderId
		);
		const selectedImageCreatorModels = selectedImageCreatorGroup?.models ?? [];
		const selectedTextToVideoGroup = textToVideoModelGroups.find(
			(group) => group.provider.id === textToVideoProviderId
		);
		const selectedTextToVideoModels = selectedTextToVideoGroup?.models ?? [];
		const selectedMusicCreatorGroup = musicCreatorModelGroups.find(
			(group) => group.provider.id === musicCreatorProviderId
		);
		const selectedMusicCreatorModels = selectedMusicCreatorGroup?.models ?? [];
		const ocrModelName = 'Not available yet';
		const toggleModelArea = (areaId: ModelAreaId): void => {
			setExpandedModelAreaId((current) => (current === areaId ? AGENTS.assistant : areaId));
		};
		const renderProviderModelFields = ({
			providerSelectId,
			modelSelectId,
			providerId,
			modelId,
			groups,
			models,
			providerLabel,
			modelLabel,
			placeholder,
			onProviderChange,
			onModelChange,
		}: {
			readonly providerSelectId: string;
			readonly modelSelectId: string;
			readonly providerId: string;
			readonly modelId: string;
			readonly groups: readonly ProviderModelGroup[];
			readonly models: readonly Model[];
			readonly providerLabel: string;
			readonly modelLabel: string;
			readonly placeholder: string;
			readonly onProviderChange: (value: string | null) => void;
			readonly onModelChange: (value: string | null) => void;
		}): React.JSX.Element => (
			<div className="grid gap-3 sm:grid-cols-2">
				<SettingsField id={providerSelectId} label={providerLabel}>
					<Select
						value={providerId}
						onValueChange={onProviderChange}
						disabled={loadingModels || groups.length === 0 || savingConfig}
					>
						<SelectTrigger id={providerSelectId} className="w-full text-xs sm:w-72">
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{groups.map((group) => {
								const catalog = getProviderCatalogItem(group.provider.id);
								return (
									<SelectItem key={group.provider.id} value={group.provider.id}>
										{catalog.name}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				</SettingsField>
				<SettingsField id={modelSelectId} label={modelLabel}>
					<Select
						value={modelId}
						onValueChange={onModelChange}
						disabled={loadingModels || models.length === 0 || savingConfig}
					>
						<SelectTrigger id={modelSelectId} className="w-full text-xs sm:w-72">
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{models.map((model) => (
								<SelectItem key={model.id} value={model.id}>
									{model.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingsField>
			</div>
		);
		const renderModelAreaPanel = (
			areaId: ModelAreaId,
			summary: string,
			children: React.ReactNode,
			disabled = false
		): React.JSX.Element => {
			const area = MODEL_AREAS.find((item) => item.id === areaId);
			if (!area) throw new Error(`Unknown model area: ${areaId}`);
			const Icon = area.icon;
			const expanded = !disabled && expandedModelAreaId === area.id;

			return (
				<SettingsPanel key={area.id}>
					<Item
						as="button"
						type="button"
						disabled={disabled}
						size="md"
						aria-expanded={expanded}
						aria-controls={`model-area-${area.id}`}
						className={cn(
							'text-left hover:bg-muted/30',
							expanded && 'border-b border-border/60',
							disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
						)}
						onClick={() => toggleModelArea(area.id)}
					>
						<ItemMedia variant="icon">
							<Icon className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle>{area.title}</ItemTitle>
							<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
								{summary}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<ChevronDown
								className={cn(
									'size-3 text-muted-foreground transition-transform',
									expanded && 'rotate-180'
								)}
								strokeWidth={1.8}
							/>
						</ItemActions>
					</Item>
					{expanded && (
						<div id={`model-area-${area.id}`} className="grid gap-3 p-3">
							<p className="text-[11px] leading-4 text-muted-foreground">{area.purpose}</p>
							{children}
						</div>
					)}
				</SettingsPanel>
			);
		};

		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Configure models
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Choose the active assistant model. The remaining model areas are disabled for this setup
						flow.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					{renderModelAreaPanel(
						AGENTS.assistant,
						selectedModelName || modelCountLabel,
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id={MODEL_FIELD_IDS[AGENTS.assistant].provider} label="Provider">
									<Select
										value={configProvider}
										onValueChange={handleAgentProviderChange}
										disabled={assistantProviderItems.length === 0}
									>
										<SelectTrigger
											id={MODEL_FIELD_IDS[AGENTS.assistant].provider}
											className="w-full text-xs sm:w-72"
										>
											<SelectValue placeholder={modelCountLabel} />
										</SelectTrigger>
										<SelectContent>
											{assistantProviderItems.map((provider) => {
												const registered = registeredProviderIds.has(provider.id);
												return (
													<SelectItem key={provider.id} value={provider.id}>
														<span className="min-w-0 flex-1 truncate">{provider.label}</span>
														<span
															className={cn(
																'ml-auto shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium',
																registered
																	? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
																	: 'bg-muted text-muted-foreground'
															)}
														>
															{registered ? 'API key saved' : 'No API key'}
														</span>
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</SettingsField>
								<SettingsField id={MODEL_FIELD_IDS[AGENTS.assistant].model} label="Model">
									<Select
										value={selectedModel}
										onValueChange={handleAgentModelChange}
										disabled={loadingModels || selectedAgentModels.length === 0}
									>
										<SelectTrigger
											id={MODEL_FIELD_IDS[AGENTS.assistant].model}
											className="w-full text-xs sm:w-72"
										>
											<SelectValue placeholder={modelCountLabel} />
										</SelectTrigger>
										<SelectContent>
											{selectedAgentModels.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>
							</div>
						</>
					)}

					{renderModelAreaPanel(
						AGENTS.speechToText,
						speechStatus,
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id={MODEL_FIELD_IDS[AGENTS.speechToText].provider} label="Provider">
									<Select
										value={speechProviderId}
										onValueChange={handleSpeechProviderChange}
										disabled={loadingModels || speechModelGroups.length === 0 || savingConfig}
									>
										<SelectTrigger
											id={MODEL_FIELD_IDS[AGENTS.speechToText].provider}
											className="w-full text-xs sm:w-72"
										>
											<SelectValue placeholder={speechStatus} />
										</SelectTrigger>
										<SelectContent>
											{speechModelGroups.map((group) => {
												const catalog = getProviderCatalogItem(group.provider.id);
												return (
													<SelectItem key={group.provider.id} value={group.provider.id}>
														{catalog.name}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
								</SettingsField>
								<SettingsField
									id={MODEL_FIELD_IDS[AGENTS.speechToText].model}
									label="Transcription model"
								>
									<Select
										value={selectedSpeechModel}
										onValueChange={handleSpeechModelChange}
										disabled={loadingModels || selectedSpeechModels.length === 0 || savingConfig}
									>
										<SelectTrigger
											id={MODEL_FIELD_IDS[AGENTS.speechToText].model}
											className="w-full text-xs sm:w-72"
										>
											<SelectValue placeholder={speechStatus} />
										</SelectTrigger>
										<SelectContent>
											{selectedSpeechModels.map((option) => (
												<SelectItem key={option.id} value={option.id}>
													{option.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>
							</div>
							{speechModelGroups.length === 0 ? (
								<SettingsNotice icon={Mic}>
									Connect a speech-to-text capable provider to enable live transcription.
								</SettingsNotice>
							) : null}
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.textToSpeech,
						loadingModels
							? 'Loading models...'
							: getProviderModelSelectionLabel(
									getProviderModelOption(
										textToSpeechModelGroups,
										textToSpeechProviderId,
										selectedTextToSpeechModel
									)
								),
						<>
							{renderProviderModelFields({
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
							})}
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.textToImage,
						loadingModels
							? 'Loading models...'
							: getProviderModelSelectionLabel(
									getProviderModelOption(
										imageCreatorModelGroups,
										imageCreatorProviderId,
										selectedImageCreatorModel
									)
								),
						<>
							{renderProviderModelFields({
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
							})}
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.textToVideo,
						loadingModels
							? 'Loading models...'
							: getProviderModelSelectionLabel(
									getProviderModelOption(
										textToVideoModelGroups,
										textToVideoProviderId,
										selectedTextToVideoModel
									)
								),
						<>
							{renderProviderModelFields({
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
							})}
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.textToAudio,
						loadingModels
							? 'Loading models...'
							: getProviderModelSelectionLabel(
									getProviderModelOption(
										musicCreatorModelGroups,
										musicCreatorProviderId,
										selectedMusicCreatorModel
									)
								),
						<>
							{renderProviderModelFields({
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
							})}
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.documentReader,
						'Document reading',
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id="ocr-endpoint" label="Current path">
									<div className="min-h-8 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground">
										ocr.run endpoint
									</div>
								</SettingsField>
								<SettingsField id="ocr-model" label="Provider model">
									<div className="min-h-8 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
										{ocrModelName}
									</div>
								</SettingsField>
							</div>
							<SettingsNotice icon={FileSearch}>
								OCR provider and model setup will appear here when document reading uses provider
								models.
							</SettingsNotice>
						</>,
						true
					)}

					{renderModelAreaPanel(
						AGENTS.embedding,
						'Semantic indexing',
						<>
							<SettingsNotice icon={Database}>
								Embedding provider and model setup will appear here when semantic indexing is
								implemented.
							</SettingsNotice>
						</>,
						true
					)}
				</div>
			</div>
		);
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'presentation') return renderPresentationStep();
		if (step === 'providers') return renderProviderStep();
		return renderModelsStep();
	}

	return (
		<main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
			<header className="pointer-events-none fixed inset-x-0 top-12 z-40 px-4 py-3 sm:px-6">
				<nav
					aria-label="Setup navigation"
					className="mx-auto flex w-full max-w-2xl items-center justify-end"
				>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="pointer-events-auto"
						onClick={() => navigate('/home')}
					>
						Skip
					</Button>
				</nav>
			</header>

			<section className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 sm:px-6">
				{renderStepContent()}
				{errorMessage ? (
					<div className="mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" />
						<p className="min-w-0 break-words text-xs font-medium leading-4">{errorMessage}</p>
					</div>
				) : null}
			</section>

			<footer className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-3 py-2 sm:px-5">
				<div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
					<StepProgress currentIndex={stepIndex} />
					<p className="truncate text-xs font-semibold text-muted-foreground">
						{STEP_TITLES[step]}
					</p>
				</div>
				<div className="flex items-center gap-2">
					{step !== 'presentation' ? (
						<Button
							type="button"
							variant="outline"
							size="xs"
							disabled={isBusy}
							onClick={handleBack}
						>
							Back
						</Button>
					) : null}
					<Button
						type="button"
						size="sm"
						disabled={isPrimaryDisabled()}
						onClick={handlePrimaryAction}
					>
						{savingProviderId !== null || savingConfig ? (
							<LoaderCircle className="size-3.5 animate-spin" />
						) : (
							<ArrowRight className="size-3.5" />
						)}
						{getPrimaryLabel()}
					</Button>
				</div>
			</footer>
		</main>
	);
};

export default StartPage;
