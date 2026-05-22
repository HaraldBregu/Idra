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
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import {
	CHAT_MODELS_BY_PROVIDER,
	EMBEDDING_MODELS_BY_PROVIDER,
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	type ModelCatalog,
	type ProviderModel,
} from '../../../../shared/provider-models';
import {
	DOCUMENT_READER_OCR_MODELS,
	OPERATOR_DEFINITIONS,
	type ConfiguredModelOperator,
	type Model,
	type OperatorStatus,
} from '../../../../shared/service';
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

type ProviderSetupEntry = {
	providerId: string;
	apiKey: string;
	apiKeySaved: boolean;
	editing: boolean;
};

type SetupStep = 'presentation' | 'providers' | 'models';
type ModelAreaId =
	| 'assistant'
	| 'speech-to-text'
	| 'text-to-speech'
	| 'text-to-image'
	| 'text-to-video'
	| 'text-to-audio'
	| 'ocr'
	| 'embedding';
type ModelAreaStatus = OperatorStatus | 'endpoint-backed' | 'unavailable';

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

type CatalogModelGroup = {
	provider: ProviderCatalogItem;
	models: readonly ProviderModel[];
};

type AgentModelOption = {
	value: string;
	provider: PublicProvider;
	catalog: ProviderCatalogItem;
	model: Model;
};

type ModelAreaDefinition = {
	id: ModelAreaId;
	title: string;
	purpose: string;
	icon: LucideIcon;
	status: ModelAreaStatus;
};

const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY_LABEL = 'sk-************' as const;
const AGENT_MODEL_VALUE_SEPARATOR = '::';
const SETUP_STEPS: readonly SetupStep[] = ['presentation', 'providers', 'models'];

const STEP_TITLES: Record<SetupStep, string> = {
	presentation: 'Presentation',
	providers: 'Provider setup',
	models: 'Configure models',
};

const MODEL_AREAS: readonly ModelAreaDefinition[] = [
	{
		id: 'assistant',
		title: `${PRODUCT_NAME} Assistant`,
		purpose: 'Main chat and agent reasoning model.',
		icon: Bot,
		status: OPERATOR_DEFINITIONS.assistant.status,
	},
	{
		id: 'speech-to-text',
		title: 'Voice Input',
		purpose: 'Dictation and transcription model.',
		icon: Mic,
		status: OPERATOR_DEFINITIONS.speechToText.status,
	},
	{
		id: 'text-to-speech',
		title: 'Voice Output',
		purpose: 'Spoken output model.',
		icon: Volume2,
		status: OPERATOR_DEFINITIONS.textToSpeech.status,
	},
	{
		id: 'text-to-image',
		title: 'Text to Image',
		purpose: 'Image generation model area.',
		icon: ImageIcon,
		status: OPERATOR_DEFINITIONS.imageCreator.status,
	},
	{
		id: 'text-to-video',
		title: 'Text to Video',
		purpose: 'Video generation model area.',
		icon: Video,
		status: OPERATOR_DEFINITIONS.videoCreator.status,
	},
	{
		id: 'text-to-audio',
		title: 'Text to Audio',
		purpose: 'Sound and music generation model area.',
		icon: Music,
		status: OPERATOR_DEFINITIONS.musicCreator.status,
	},
	{
		id: 'ocr',
		title: 'OCR',
		purpose: 'Endpoint-backed document reading with future provider-backed model setup.',
		icon: FileSearch,
		status: 'endpoint-backed',
	},
	{
		id: 'embedding',
		title: 'Embedding',
		purpose: 'Future semantic indexing model setup.',
		icon: Database,
		status: 'unavailable',
	},
];

function normalizeProvider(provider: Provider, index: number): ProviderOption {
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

function getCatalogGroups(catalog: ModelCatalog): CatalogModelGroup[] {
	return Object.entries(catalog)
		.map(([providerId, models]) => ({
			provider: getProviderCatalogItem(providerId),
			models,
		}))
		.filter((group) => group.models.length > 0);
}

function getCatalogCountLabel(groups: readonly CatalogModelGroup[]): string {
	const modelCount = groups.reduce((count, group) => count + group.models.length, 0);
	if (modelCount === 0) return 'No catalog entries';
	const providerLabel = groups.length === 1 ? 'provider' : 'providers';
	const modelLabel = modelCount === 1 ? 'model' : 'models';
	return `${modelCount} ${modelLabel} across ${groups.length} ${providerLabel}`;
}

function getOperatorSelectionLabel(operator: ConfiguredModelOperator | undefined): string {
	if (!operator) return 'Not configured';
	return `${operator.provider.name} - ${operator.model.name}`;
}

function getStatusLabel(status: ModelAreaStatus): string {
	if (status === 'implemented') return 'Implemented';
	if (status === 'pending-runtime') return 'Pending runtime';
	if (status === 'placeholder') return 'Placeholder';
	if (status === 'endpoint-backed') return 'Endpoint-backed';
	return 'Unavailable';
}

function getStatusClassName(status: ModelAreaStatus): string {
	if (status === 'implemented') {
		return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
	}
	if (status === 'endpoint-backed') {
		return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
	}
	if (status === 'unavailable') {
		return 'border-border bg-muted/40 text-muted-foreground';
	}
	return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

function StatusBadge({ status }: { readonly status: ModelAreaStatus }): React.JSX.Element {
	return (
		<Badge variant="outline" className={cn('h-5 rounded-md px-1.5', getStatusClassName(status))}>
			{getStatusLabel(status)}
		</Badge>
	);
}

function CatalogRows({
	groups,
	emptyLabel = 'No provider catalog is available yet.',
}: {
	readonly groups: readonly CatalogModelGroup[];
	readonly emptyLabel?: string;
}): React.JSX.Element {
	if (groups.length === 0) {
		return (
			<div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
				{emptyLabel}
			</div>
		);
	}

	return (
		<div className="max-h-52 overflow-y-auto rounded-lg border border-border/70 bg-background">
			{groups.map((group) => (
				<div
					key={group.provider.id}
					className="grid gap-1 border-b border-border/60 px-3 py-2 last:border-b-0"
				>
					<div className="flex min-w-0 items-center justify-between gap-2">
						<div className="min-w-0 truncate text-xs font-semibold text-foreground">
							{group.provider.name}
						</div>
						<Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
							{group.models.length}
						</Badge>
					</div>
					<p className="line-clamp-2 text-[11px] leading-4 text-muted-foreground">
						{group.models.map((model) => model.name).join(', ')}
					</p>
				</div>
			))}
		</div>
	);
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
	const [expandedModelAreaId, setExpandedModelAreaId] = useState<ModelAreaId>('assistant');
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
	const [savedTextToSpeechOperator, setSavedTextToSpeechOperator] =
		useState<ConfiguredModelOperator>();
	const [savedImageCreatorOperator, setSavedImageCreatorOperator] =
		useState<ConfiguredModelOperator>();
	const [savedTextToVideoOperator, setSavedTextToVideoOperator] =
		useState<ConfiguredModelOperator>();
	const [savedMusicCreatorOperator, setSavedMusicCreatorOperator] =
		useState<ConfiguredModelOperator>();
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const stepIndex = SETUP_STEPS.indexOf(step);
	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && !savingProviderId;
	const agentModelOptions = useMemo<AgentModelOption[]>(
		() =>
			agentModelGroups.flatMap((group) => {
				const catalog = getProviderCatalogItem(group.provider.id);
				return group.models.map((model) => ({
					value: getAgentModelValue(group.provider.id, model.id),
					provider: group.provider,
					catalog,
					model,
				}));
			}),
		[agentModelGroups]
	);
	const selectedAgentModelValue =
		configProvider && selectedModel ? getAgentModelValue(configProvider, selectedModel) : '';
	const selectedAgentModelOption = agentModelOptions.find(
		(option) => option.value === selectedAgentModelValue
	);
	const selectedAgentModelGroup = agentModelGroups.find(
		(group) => group.provider.id === configProvider
	);
	const selectedAgentModels = selectedAgentModelGroup?.models ?? [];
	const selectedModelName = selectedAgentModelOption?.model.name ?? selectedModel;
	const modelCountLabel = loadingModels
		? 'Loading models...'
		: agentModelOptions.length === 0
			? 'No models available'
			: `${agentModelOptions.length} models available`;
	const canSaveAgentModel =
		selectedAgentModelOption !== undefined && !loadingModels && !savingConfig;
	const isBusy = savingProviderId !== null || savingConfig;
	const connectedProviderIds = useMemo(
		() =>
			new Set(
				providerEntries.filter((entry) => entry.apiKeySaved).map((entry) => entry.providerId)
			),
		[providerEntries]
	);
	const llmCatalogGroups = useMemo(() => getCatalogGroups(CHAT_MODELS_BY_PROVIDER), []);
	const speechToTextCatalogGroups = useMemo(
		() => getCatalogGroups(SPEECH_TO_TEXT_MODELS_BY_PROVIDER),
		[]
	);
	const textToSpeechCatalogGroups = useMemo(
		() => getCatalogGroups(TEXT_TO_SPEECH_MODELS_BY_PROVIDER),
		[]
	);
	const textToImageCatalogGroups = useMemo(
		() => getCatalogGroups(TEXT_TO_IMAGE_MODELS_BY_PROVIDER),
		[]
	);
	const textToVideoCatalogGroups = useMemo(
		() => getCatalogGroups(TEXT_TO_VIDEO_MODELS_BY_PROVIDER),
		[]
	);
	const textToAudioCatalogGroups = useMemo(
		() => getCatalogGroups(TEXT_TO_AUDIO_MODELS_BY_PROVIDER),
		[]
	);
	const embeddingCatalogGroups = useMemo(
		() => getCatalogGroups(EMBEDDING_MODELS_BY_PROVIDER),
		[]
	);

	useEffect(() => {
		if (step !== 'providers') return;
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
			try {
				const savedEntries = await Promise.all(
					actionableProviderCatalog.map(async (provider) => {
						const saved = await window.app.isProviderApiKeySaved(provider.id);
						return [provider.id, saved] as const;
					})
				);
				if (cancelled) return;

				const savedByProviderId = new Map(savedEntries);
				const hasSavedProvider = savedEntries.some(([, saved]) => saved);
				setProviderEntries((entries) =>
					actionableProviderCatalog.map((provider, index) => {
						const current = entries.find((entry) => entry.providerId === provider.id);
						const saved = savedByProviderId.get(provider.id) ?? false;
						const draft = current?.apiKey ?? '';
						const hasDraft = draft.trim().length > 0;
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
			} catch (error) {
				if (cancelled) return;
				setErrorMessage(getErrorMessage(error, 'Could not check saved provider access.'));
			}
		}

		void loadApiKeyStatus();

		return () => {
			cancelled = true;
		};
	}, [step]);

	useEffect(() => {
		if (step !== 'models') return;

		let cancelled = false;

		async function loadProviders(): Promise<void> {
			try {
				const [
					storedProviders,
					assistantOperator,
					speechToTextOperator,
					textToSpeechOperator,
					imageCreatorOperator,
					textToVideoOperator,
					musicCreatorOperator,
				] = await Promise.all([
					window.app.getProviders(),
					window.app.getAssistantOperator(),
					window.app.getSpeechToTextOperator(),
					window.app.getTextToSpeechOperator(),
					window.app.getImageCreatorOperator(),
					window.app.getTextToVideoOperator(),
					window.app.getMusicCreatorOperator(),
				]);
				if (cancelled) return;

				const selectableProviders = storedProviders.filter((provider) =>
					supportedProviderIds.has(provider.id)
				);
				const preferredProvider =
					selectableProviders.find((provider) => provider.id === assistantOperator?.provider.id) ??
					selectableProviders.find((provider) => connectedProviderIds.has(provider.id)) ??
					selectableProviders[0];

				setProviders(selectableProviders);
				setConfigProvider(preferredProvider?.id ?? '');
				setSavedModelId(assistantOperator?.model.id ?? '');
				setSpeechProviderId(speechToTextOperator?.provider?.id ?? '');
				setSavedSpeechProviderId(speechToTextOperator?.provider?.id ?? '');
				setSavedSpeechModelId(speechToTextOperator?.model?.id ?? '');
				setSavedTextToSpeechOperator(textToSpeechOperator);
				setSavedImageCreatorOperator(imageCreatorOperator);
				setSavedTextToVideoOperator(textToVideoOperator);
				setSavedMusicCreatorOperator(musicCreatorOperator);
			} catch (error) {
				if (cancelled) return;
				setProviders([]);
				setConfigProvider('');
				setSavedModelId('');
				setSpeechProviderId('');
				setSavedSpeechProviderId('');
				setSavedSpeechModelId('');
				setSavedTextToSpeechOperator(undefined);
				setSavedImageCreatorOperator(undefined);
				setSavedTextToVideoOperator(undefined);
				setSavedMusicCreatorOperator(undefined);
				setErrorMessage(getErrorMessage(error, 'Could not load models.'));
			}
		}

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, [connectedProviderIds, step]);

	useEffect(() => {
		if (step !== 'models') return;

		let cancelled = false;

		async function loadModels(): Promise<void> {
			if (providers.length === 0) {
				setAgentModelGroups([]);
				setSpeechModelGroups([]);
				setSelectedModel('');
				setSpeechProviderId('');
				setSelectedSpeechModel('');
				return;
			}

			setLoadingModels(true);
			setErrorMessage('');
			try {
				const nextAgentGroups: ProviderModelGroup[] = [];
				const nextSpeechGroups: ProviderModelGroup[] = [];
				let firstError: unknown;

				for (const provider of providers) {
					try {
						const agentModels = await window.app.getModels(provider);
						if (agentModels.length > 0) {
							nextAgentGroups.push({ provider, models: agentModels });
						}
					} catch (error) {
						firstError ??= error;
					}

					try {
						const speechModels = await window.app.getSpeechToTextModels(provider);
						if (speechModels.length > 0) {
							nextSpeechGroups.push({ provider, models: speechModels });
						}
					} catch (error) {
						firstError ??= error;
					}
				}

				if (cancelled) return;

				setAgentModelGroups(nextAgentGroups);
				setSpeechModelGroups(nextSpeechGroups);

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
							option.provider.id === savedSpeechProviderId &&
							option.model.id === savedSpeechModelId
					) ??
					speechOptions.find((option) => option.provider.id === savedSpeechProviderId) ??
					speechOptions[0];

				setSpeechProviderId(preferredSpeechOption?.provider.id ?? '');
				setSelectedSpeechModel(preferredSpeechOption?.model.id ?? '');

				if (!preferredAgentOption && nextSpeechGroups.length === 0 && firstError) {
					setErrorMessage(getErrorMessage(firstError, 'Could not load models.'));
				}
			} catch (error) {
				if (cancelled) return;
				setAgentModelGroups([]);
				setSpeechModelGroups([]);
				setSelectedModel('');
				setSpeechProviderId('');
				setSelectedSpeechModel('');
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
	}, [configProvider, providers, savedModelId, savedSpeechModelId, savedSpeechProviderId, step]);

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
			await window.app.setProviderApiKey(providerId, apiKey);
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

			for (const entry of entriesToSave) {
				await window.app.setProviderApiKey(entry.providerId, entry.apiKey.trim());
			}

			if (entriesToSave.length > 0) {
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
		const group = agentModelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setConfigProvider(providerId);
		setSelectedModel(group?.models[0]?.id ?? '');
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

	function handleOpenProviderLink(provider: ProviderCatalogItem): void {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	}

	async function handleSaveAgentModel(): Promise<void> {
		if (!selectedAgentModelOption || !canSaveAgentModel) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAssistantOperator(
				selectedAgentModelOption.provider,
				selectedAgentModelOption.model
			);
			const selectedSpeechGroup = speechModelGroups.find(
				(group) => group.provider.id === speechProviderId
			);
			const selectedSpeechOption = selectedSpeechGroup?.models.find(
				(model) => model.id === selectedSpeechModel
			);
			if (selectedSpeechGroup && selectedSpeechOption) {
				await window.app.saveSpeechToTextOperator(selectedSpeechGroup.provider, {
					id: selectedSpeechOption.id,
					name: selectedSpeechOption.name,
				});
			}
			navigate('/home');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the selected models.'));
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
		if (step === 'models') return !canSaveAgentModel;
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
					Connect an AI provider, choose the models {PRODUCT_NAME} should use, and review
					which model areas are ready now.
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
												{connected
													? MASKED_API_KEY_LABEL
													: provider.capabilities}
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
							Keys stay in {PRODUCT_NAME}&apos;s local app data folder and are only used for providers
							you connect. You can revoke them anytime.
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
		const ocrModelName = DOCUMENT_READER_OCR_MODELS[0]?.name ?? 'Not available yet';
		const toggleModelArea = (areaId: ModelAreaId): void => {
			setExpandedModelAreaId((current) => (current === areaId ? 'assistant' : areaId));
		};
		const renderModelAreaPanel = (
			areaId: ModelAreaId,
			summary: string,
			children: React.ReactNode
		): React.JSX.Element => {
			const area = MODEL_AREAS.find((item) => item.id === areaId);
			if (!area) throw new Error(`Unknown model area: ${areaId}`);
			const Icon = area.icon;
			const expanded = expandedModelAreaId === area.id;

			return (
				<SettingsPanel key={area.id}>
					<Item
						as="button"
						type="button"
						size="md"
						aria-expanded={expanded}
						aria-controls={`model-area-${area.id}`}
						className={cn('text-left hover:bg-muted/30', expanded && 'border-b border-border/60')}
						onClick={() => toggleModelArea(area.id)}
					>
						<ItemMedia variant="icon">
							<Icon className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<div className="flex w-full min-w-0 items-center gap-2">
								<ItemTitle>{area.title}</ItemTitle>
								<StatusBadge status={area.status} />
							</div>
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
						Choose the active assistant and voice input models, then review the remaining model
						areas and their runtime status.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					{renderModelAreaPanel(
						'assistant',
						selectedModelName || modelCountLabel,
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id="agent-provider" label="Provider">
									<Select
										value={configProvider}
										onValueChange={handleAgentProviderChange}
										disabled={loadingModels || agentModelGroups.length === 0 || savingConfig}
									>
										<SelectTrigger id="agent-provider" className="w-full text-xs sm:w-72">
											<SelectValue placeholder={modelCountLabel} />
										</SelectTrigger>
										<SelectContent>
											{agentModelGroups.map((group) => {
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
								<SettingsField id="agent-model" label="Model">
									<Select
										value={selectedModel}
										onValueChange={handleAgentModelChange}
										disabled={loadingModels || selectedAgentModels.length === 0 || savingConfig}
									>
										<SelectTrigger id="agent-model" className="w-full text-xs sm:w-72">
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
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(llmCatalogGroups)}</span>
								</div>
								<CatalogRows groups={llmCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'speech-to-text',
						speechStatus,
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id="speech-provider" label="Provider">
									<Select
										value={speechProviderId}
										onValueChange={handleSpeechProviderChange}
										disabled={loadingModels || speechModelGroups.length === 0 || savingConfig}
									>
										<SelectTrigger id="speech-provider" className="w-full text-xs sm:w-72">
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
								<SettingsField id="speech-model" label="Transcription model">
									<Select
										value={selectedSpeechModel}
										onValueChange={handleSpeechModelChange}
										disabled={loadingModels || selectedSpeechModels.length === 0 || savingConfig}
									>
										<SelectTrigger id="speech-model" className="w-full text-xs sm:w-72">
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
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(speechToTextCatalogGroups)}</span>
								</div>
								<CatalogRows groups={speechToTextCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'text-to-speech',
						getOperatorSelectionLabel(savedTextToSpeechOperator),
						<>
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField id="tts-selection" label="Saved selection">
									<div className="min-h-8 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground">
										{getOperatorSelectionLabel(savedTextToSpeechOperator)}
									</div>
								</SettingsField>
								<SettingsField id="tts-runtime" label="Runtime">
									<div className="flex min-h-8 items-center">
										<StatusBadge status={OPERATOR_DEFINITIONS.textToSpeech.status} />
									</div>
								</SettingsField>
							</div>
							<SettingsNotice icon={Volume2}>
								Voice output has a catalog, but spoken output runtime is still pending.
							</SettingsNotice>
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(textToSpeechCatalogGroups)}</span>
								</div>
								<CatalogRows groups={textToSpeechCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'text-to-image',
						getOperatorSelectionLabel(savedImageCreatorOperator),
						<>
							<SettingsNotice icon={ImageIcon}>
								Image service, task, and tool paths exist; provider adapters are pending.
							</SettingsNotice>
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(textToImageCatalogGroups)}</span>
								</div>
								<CatalogRows groups={textToImageCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'text-to-video',
						getOperatorSelectionLabel(savedTextToVideoOperator),
						<>
							<SettingsNotice icon={Video}>
								Video model selection is cataloged; provider adapters and runtime execution are
								pending.
							</SettingsNotice>
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(textToVideoCatalogGroups)}</span>
								</div>
								<CatalogRows groups={textToVideoCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'text-to-audio',
						getOperatorSelectionLabel(savedMusicCreatorOperator),
						<>
							<SettingsNotice icon={Music}>
								Sound and music generation are cataloged; provider adapters and runtime execution are
								pending.
							</SettingsNotice>
							<div className="grid gap-1.5">
								<div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
									<span>Catalog</span>
									<span>{getCatalogCountLabel(textToAudioCatalogGroups)}</span>
								</div>
								<CatalogRows groups={textToAudioCatalogGroups} />
							</div>
						</>
					)}

					{renderModelAreaPanel(
						'ocr',
						'Endpoint-backed OCR task available',
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
								Provider-backed OCR model setup is pending.
							</SettingsNotice>
						</>
					)}

					{renderModelAreaPanel(
						'embedding',
						'Unavailable until semantic indexing runtime is implemented',
						<>
							<CatalogRows
								groups={embeddingCatalogGroups}
								emptyLabel="Embedding remains unavailable until provider catalogs, vector index behavior, and runtime adapters are implemented."
							/>
						</>
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
