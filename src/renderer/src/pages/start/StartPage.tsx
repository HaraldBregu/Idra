import React, { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	Bot,
	Check,
	ExternalLink,
	Image as ImageIcon,
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
	ASSISTANT_OPERATOR_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	OPERATOR_DEFINITIONS,
	SPEECH_TO_TEXT_OPERATOR_ID,
	type ConfiguredModelOperator,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
	type Model,
} from '../../../../shared/agents/service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProviderAvatar } from '@/components/ui/provider-avatar';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

type ModelServiceId =
	| typeof ASSISTANT_OPERATOR_ID
	| typeof SPEECH_TO_TEXT_OPERATOR_ID
	| typeof TEXT_TO_SPEECH_OPERATOR_ID
	| typeof IMAGE_CREATOR_OPERATOR_ID
	| typeof TEXT_TO_VIDEO_OPERATOR_ID
	| typeof MUSIC_CREATOR_OPERATOR_ID;

type ModelServiceDefinition = {
	id: ModelServiceId;
	label: string;
	stepName: string;
	stepTitle: string;
	stepDescription: string;
	providerDescription: string;
	modelDescription: string;
	icon: LucideIcon;
	required: boolean;
	getOperator: () => Promise<ConfiguredModelOperator | undefined>;
	getModels: (provider: PublicProvider) => Promise<Model[]>;
	saveOperator: (provider: PublicProvider, model: Model) => Promise<boolean>;
};

type ModelServiceState = {
	providerId: string;
	modelId: string;
	modelGroups: ProviderModelGroup[];
};

type ModelServiceStateMap = Record<ModelServiceId, ModelServiceState>;

const MODEL_SERVICE_DEFINITIONS: readonly ModelServiceDefinition[] = [
	{
		id: ASSISTANT_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.assistant.name,
		stepName: 'Assistant',
		stepTitle: 'Assistant model selection',
		stepDescription:
			'Choose the core language model Friday uses for chat replies, reasoning, summaries, and tool planning.',
		providerDescription: 'Use a provider with strong general-purpose language models.',
		modelDescription: 'Pick the default assistant model for everyday conversations and tasks.',
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
		stepTitle: 'Speech-to-text transcription',
		stepDescription:
			'Choose the model that turns microphone input and audio files into text before Friday responds.',
		providerDescription: 'Use a provider that supports reliable transcription models.',
		modelDescription: 'Pick the transcription model for voice commands, notes, and uploaded audio.',
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
		stepTitle: 'Text-to-speech voice output',
		stepDescription:
			'Choose the voice model Friday uses to read assistant responses and generated text aloud.',
		providerDescription: 'Use a provider with voice models that match your preferred output quality.',
		modelDescription: 'Pick the synthesis model for spoken responses and generated narration.',
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
		stepTitle: 'Image generation model',
		stepDescription:
			'Choose the model Friday uses for creating images and visual assets from prompts.',
		providerDescription: 'Use a provider with image models available for generation tasks.',
		modelDescription: 'Pick the image model for prompt-based image creation.',
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
		stepDescription:
			'Choose the model Friday uses when generating or editing short video clips.',
		providerDescription: 'Use a provider with video models configured for creation workflows.',
		modelDescription: 'Pick the video model for text-to-video requests.',
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
		providerDescription: 'Use a provider with music or audio generation models.',
		modelDescription: 'Pick the music model for composition and sound generation.',
		icon: Music,
		required: false,
		getOperator: () => window.app.getMusicCreatorOperator(),
		getModels: (provider) => window.app.getMusicCreatorModels(provider),
		saveOperator: (provider, model) => window.app.saveMusicCreatorOperator(provider, model),
	},
];

type SetupStep = 'presentation' | 'providers' | ModelServiceId;

const MODEL_SERVICE_STEP_IDS: readonly ModelServiceId[] = MODEL_SERVICE_DEFINITIONS.map(
	(service) => service.id
);
const SETUP_STEPS: readonly SetupStep[] = ['presentation', 'providers', ...MODEL_SERVICE_STEP_IDS];

const SETUP_STEP_TITLES: Record<SetupStep, string> = MODEL_SERVICE_DEFINITIONS.reduce(
	(acc, service) => ({
		...acc,
		[service.id]: service.stepName,
	}),
	{
		presentation: 'Welcome',
		providers: 'Providers',
	} as Record<SetupStep, string>
);

function isModelStep(step: SetupStep): step is ModelServiceId {
	return step !== 'presentation' && step !== 'providers';
}

function createInitialModelServiceState(): ModelServiceStateMap {
	return MODEL_SERVICE_DEFINITIONS.reduce(
		(acc, service) => ({
			...acc,
			[service.id]: {
				providerId: '',
				modelId: '',
				modelGroups: [],
			},
		}),
		{} as ModelServiceStateMap
	);
}


const MASKED_API_KEY_LABEL = 'sk-************' as const;

const STEP_COPY: Record<'presentation' | 'providers', { title: string; description: string }> = {
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

type StepFieldProps = {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly children: React.ReactNode;
	readonly className?: string;
};

function StepField({ id, label, description, children, className }: StepFieldProps): React.JSX.Element {
	return (
		<div className={cn('grid gap-1.5', className)}>
			<div className="grid gap-1">
				<Label htmlFor={id} className="text-[11px] leading-4">
					{label}
				</Label>
				{description ? (
					<p id={`${id}-description`} className="text-[11px] leading-4 text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</div>
	);
}



function StepProgress({ currentIndex }: { readonly currentIndex: number }): React.JSX.Element {
	const currentStep = SETUP_STEPS[currentIndex];
	const currentStepName = currentStep ? SETUP_STEP_TITLES[currentStep] : 'Setup';

	return (
		<div className="grid gap-1.5" aria-label={`Step ${currentIndex + 1} of ${SETUP_STEPS.length}`}>
			<div className="flex items-center gap-1.5">
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
			<p className="truncate text-[11px] text-muted-foreground">{currentStepName}</p>
		</div>
	);
}

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [step, setStep] = useState<SetupStep>('presentation');
	const [providerEntries, setProviderEntries] = useState<ProviderSetupEntry[]>(() =>
		actionableProviderCatalog.map((provider, index) => ({
			providerId: provider.id,
			apiKey: '',
			apiKeySaved: false,
			editing: index === 0,
		}))
	);
	const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
	const [serviceStates, setServiceStates] = useState<ModelServiceStateMap>(
		createInitialModelServiceState
	);
	const [loadingModels, setLoadingModels] = useState(false);
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const stepIndex = SETUP_STEPS.indexOf(step);
	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && !savingProviderId;
	const getSelectedServiceModel = (serviceId: ModelServiceId): { provider: PublicProvider; model: Model } | undefined => {
		const serviceState = serviceStates[serviceId];
		const selectedProvider = serviceState.modelGroups.find(
			(group) => group.provider.id === serviceState.providerId
		);
		const selectedModel = selectedProvider?.models.find((model) => model.id === serviceState.modelId);
		return selectedProvider && selectedModel
			? { provider: selectedProvider.provider, model: selectedModel }
			: undefined;
	};
	const currentModelService = MODEL_SERVICE_DEFINITIONS.find((service) => service.id === step);
	const isLastModelStep = currentModelService?.id === MODEL_SERVICE_STEP_IDS[MODEL_SERVICE_STEP_IDS.length - 1];
	const canSaveModelSetup =
		!loadingModels &&
		!savingConfig &&
		(!isModelStep(step) ||
			!currentModelService?.required ||
			getSelectedServiceModel(currentModelService.id) !== undefined);
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
		if (!isModelStep(step)) return;

		let cancelled = false;

		async function loadServiceModels(): Promise<void> {
			setLoadingModels(true);
			setErrorMessage('');
			try {
				const [storedProviders, ...configuredOperators] = await Promise.all([
					window.app.getProviders(),
					...MODEL_SERVICE_DEFINITIONS.map((service) => service.getOperator()),
				]);
				if (cancelled) return;

				const selectableProviders = storedProviders.filter((provider) =>
					supportedProviderIds.has(provider.id)
				);
				const nextServiceStates = createInitialModelServiceState();
				let firstError: unknown;
				if (selectableProviders.length > 0) {
					for (let index = 0; index < MODEL_SERVICE_DEFINITIONS.length; index += 1) {
						const service = MODEL_SERVICE_DEFINITIONS[index];
						const operator = configuredOperators[index];

						const preferredProvider =
							(operator
								? selectableProviders.find((provider) => provider.id === operator.provider.id)
								: undefined) ??
							selectableProviders.find((provider) => connectedProviderIds.has(provider.id)) ??
							selectableProviders[0];

						const modelGroups: ProviderModelGroup[] = [];
						for (const provider of selectableProviders) {
							try {
								const models = await service.getModels(provider);
								if (models.length > 0) {
									modelGroups.push({ provider, models });
								}
							} catch (error) {
								firstError ??= error;
							}
						}

						const preferredModelGroups =
							modelGroups.find((group) => group.provider.id === preferredProvider?.id) ??
							modelGroups[0];
						const providerId = preferredModelGroups?.provider.id ?? '';
						const preferredModelId = operator?.model.id;
						const modelId =
							preferredModelGroups?.models.find((model) => model.id === preferredModelId)?.id ??
							preferredModelGroups?.models[0]?.id ??
							'';

						nextServiceStates[service.id] = {
							providerId,
							modelId,
							modelGroups,
						};
					}
				}

				if (cancelled) return;
				setServiceStates(nextServiceStates);

				if (firstError) {
					setErrorMessage(getErrorMessage(firstError, 'Could not load models.'));
				}
			} catch (error) {
				if (cancelled) return;
				setServiceStates(createInitialModelServiceState());
				setErrorMessage(getErrorMessage(error, 'Could not load models for this provider.'));
			} finally {
				if (!cancelled) {
					setLoadingModels(false);
				}
			}
		}

		void loadServiceModels();

		return () => {
			cancelled = true;
		};
	}, [connectedProviderIds, step]);

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

			const firstModelStep = MODEL_SERVICE_STEP_IDS[0];
			if (firstModelStep) {
				goToStep(firstModelStep);
			}
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save provider API keys.'));
		} finally {
			setSavingProviderId(null);
		}
	}

	function handleServiceProviderChange(serviceId: ModelServiceId, value: string | null): void {
		const providerId = value ?? '';
		const serviceState = serviceStates[serviceId];
		const group = serviceState.modelGroups.find((item) => item.provider.id === providerId);
		setErrorMessage('');
		setServiceStates((states) => ({
			...states,
			[serviceId]: {
				...states[serviceId],
				providerId,
				modelId: group?.models[0]?.id ?? '',
			},
		}));
	}

	function handleServiceModelChange(serviceId: ModelServiceId, value: string | null): void {
		setErrorMessage('');
		setServiceStates((states) => ({
			...states,
			[serviceId]: { ...states[serviceId], modelId: value ?? '' },
		}));
	}

	function handleOpenProviderLink(provider: ProviderCatalogItem): void {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	}

	async function handleSaveModelStep(): Promise<void> {
		if (!canSaveModelSetup || !currentModelService) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			const selectedModel = getSelectedServiceModel(currentModelService.id);
			if (selectedModel) {
				const saved = await currentModelService.saveOperator(
					selectedModel.provider,
					selectedModel.model
				);
				if (!saved) {
					throw new Error(`Could not save the selected ${currentModelService.stepTitle} model.`);
				}
			}

			const nextIndex = stepIndex + 1;
			const nextStep = SETUP_STEPS[nextIndex];
			if (!nextStep) {
				navigate('/home');
				return;
			}

			goToStep(nextStep);
		} catch (error) {
			setErrorMessage(
				getErrorMessage(
					error,
					`Could not save the selected ${currentModelService.stepTitle} model.`
				)
			);
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

		if (isModelStep(step)) {
			void handleSaveModelStep();
			return;
		}
	}

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';
		if (isModelStep(step) && isLastModelStep) return 'Get started';
		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (isModelStep(step)) return !canSaveModelSetup;
		return isBusy;
	}

	function renderPrimaryButton(): React.JSX.Element {
		const button = (
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
		);

		const shouldShowProvidersTooltip = step === 'providers' && !canContinueProviders;
		const shouldShowModelTooltip =
			isModelStep(step) &&
			currentModelService?.required === true &&
			!getSelectedServiceModel(currentModelService.id);
		if (shouldShowProvidersTooltip || shouldShowModelTooltip) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger render={<span className="inline-flex">{button}</span>} />
						<TooltipContent>
							{shouldShowProvidersTooltip
								? 'Save an API key to continue.'
								: 'Select a model to continue.'}
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return button;
	}

	function renderPresentationStep(): React.JSX.Element {
		const { title, description } = STEP_COPY.presentation;

		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
				<DomeWaveAnimation height={120} className="w-full max-w-sm" />
				<Badge variant="secondary" className="mt-5 h-6 rounded-md px-2.5 text-xs font-semibold">
					<Check className="size-3" />
					Model setup
				</Badge>
				<h1 className="mt-5 text-3xl font-bold leading-none tracking-normal text-foreground">
					{title}
				</h1>
				<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
		);
	}

	function renderProviderStep(): React.JSX.Element {
		const { title, description } = STEP_COPY.providers;

		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						{title}
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						{description}
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
												onKeyDown={(event) => {
													if (event.key === 'Enter' && canSaveProvider) {
														void saveProviderEntry(provider.id);
													}
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
							Keys are stored locally and never shared.
						</p>
					</div>
				</div>
			</div>
		);
	}

	function renderModelServiceStep(): React.JSX.Element {
		if (!currentModelService) {
			return <></>;
		}

		const service = currentModelService;
		const serviceState = serviceStates[service.id];
		const providerModels = serviceState.modelGroups.find(
			(group) => group.provider.id === serviceState.providerId
		);
		const availableModels = providerModels?.models ?? [];
		const modelOptionsCount = serviceState.modelGroups.reduce(
			(total, group) => total + group.models.length,
			0
		);
		const modelCountLabel = loadingModels
			? 'Loading models...'
			: modelOptionsCount === 0
				? 'No models available'
				: `${modelOptionsCount} models available`;
		const selectedProviderName = providerModels
			? getProviderCatalogItem(providerModels.provider.id).name
			: '';
		const selectedModelName =
			availableModels.find((model) => model.id === serviceState.modelId)?.name ?? '';
		const selectedSummary =
			selectedProviderName && selectedModelName
				? `${selectedProviderName} / ${selectedModelName}`
				: loadingModels
					? 'Loading compatible models...'
					: service.required
						? 'Select a model to continue.'
						: 'Optional step. Continue without a selection to skip it.';

		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
				<div className="mb-5 flex size-16 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm">
					<service.icon className="size-8" strokeWidth={1.7} aria-hidden="true" />
				</div>
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						{service.stepTitle}
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						{service.stepDescription}
					</p>
				</div>

				<Card size="sm" className="mt-6 gap-0 rounded-lg border-border bg-card py-0 shadow-none">
					<CardHeader className="border-b border-border/70 px-3 py-3">
						<div className="flex min-w-0 items-start justify-between gap-3">
							<div className="min-w-0">
								<CardTitle className="text-sm">{service.stepName}</CardTitle>
								<CardDescription className="mt-1 text-xs leading-4">
									{modelCountLabel}
								</CardDescription>
							</div>
							<Badge variant={service.required ? 'default' : 'secondary'} className="shrink-0">
								{service.required ? 'Required' : 'Optional'}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="grid gap-4 p-3">
						<div className="grid gap-3 sm:grid-cols-2">
							<StepField
								id={`${service.id}-provider`}
								label="Provider"
								description={service.providerDescription}
							>
								<Select
									value={serviceState.providerId}
									onValueChange={(value) => handleServiceProviderChange(service.id, value)}
									disabled={loadingModels || serviceState.modelGroups.length === 0 || savingConfig}
								>
									<SelectTrigger
										id={`${service.id}-provider`}
										aria-describedby={`${service.id}-provider-description`}
										className="w-full text-xs"
									>
										<SelectValue placeholder={modelCountLabel} />
									</SelectTrigger>
									<SelectContent>
										{serviceState.modelGroups.map((group) => {
											const catalog = getProviderCatalogItem(group.provider.id);
											return (
												<SelectItem key={group.provider.id} value={group.provider.id}>
													{catalog.name}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</StepField>
							<StepField
								id={`${service.id}-model`}
								label="Model"
								description={service.modelDescription}
							>
								<Select
									value={serviceState.modelId}
									onValueChange={(value) => handleServiceModelChange(service.id, value)}
									disabled={loadingModels || availableModels.length === 0 || savingConfig}
								>
									<SelectTrigger
										id={`${service.id}-model`}
										aria-describedby={`${service.id}-model-description`}
										className="w-full text-xs"
									>
										<SelectValue placeholder={modelCountLabel} />
									</SelectTrigger>
									<SelectContent>
										{availableModels.map((model) => (
											<SelectItem key={model.id} value={model.id}>
												{model.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</StepField>
						</div>
						{loadingModels ? (
							<div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
								<LoaderCircle className="size-3.5 animate-spin" />
								<span>Checking connected providers for compatible models.</span>
							</div>
						) : null}
					</CardContent>
					<CardFooter className="min-h-10 px-3 py-2">
						<p className="min-w-0 truncate text-xs text-muted-foreground">{selectedSummary}</p>
					</CardFooter>
				</Card>
			</div>
		);
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'presentation') return renderPresentationStep();
		if (step === 'providers') return renderProviderStep();
		return renderModelServiceStep();
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
			</section>

			<footer className="flex shrink-0 flex-col border-t border-border bg-card/60">
				{errorMessage ? (
					<div className="flex items-start gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-destructive">
						<AlertCircle className="mt-0.5 size-3.5 shrink-0" />
						<p className="min-w-0 break-words text-xs font-medium leading-4">{errorMessage}</p>
					</div>
				) : null}
				<div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
					<StepProgress currentIndex={stepIndex} />
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
						{renderPrimaryButton()}
					</div>
				</div>
			</footer>
		</main>
	);
};

export default StartPage;
