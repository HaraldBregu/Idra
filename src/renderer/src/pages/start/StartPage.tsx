import React, { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	Check,
	ExternalLink,
	KeyRound,
	LoaderCircle,
	Pencil,
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
import { ProviderAvatar } from '@/components/provider-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SettingsField } from '../settings/components';
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
		required: true,
		getOperator: () => window.app.getAssistantOperator(),
		getModels: (provider) => window.app.getModels(provider),
		saveOperator: (provider, model) => window.app.saveAssistantOperator(provider, model),
	},
	{
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.speechToText.name,
		required: false,
		getOperator: () => window.app.getSpeechToTextOperator(),
		getModels: (provider) => window.app.getSpeechToTextModels(provider),
		saveOperator: (provider, model) => window.app.saveSpeechToTextOperator(provider, model),
	},
	{
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.textToSpeech.name,
		required: false,
		getOperator: () => window.app.getTextToSpeechOperator(),
		getModels: (provider) => window.app.getTextToSpeechModels(provider),
		saveOperator: (provider, model) => window.app.saveTextToSpeechOperator(provider, model),
	},
	{
		id: IMAGE_CREATOR_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.imageCreator.name,
		required: false,
		getOperator: () => window.app.getImageCreatorOperator(),
		getModels: (provider) => window.app.getImageCreatorModels(provider),
		saveOperator: (provider, model) => window.app.saveImageCreatorOperator(provider, model),
	},
	{
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.videoCreator.name,
		required: false,
		getOperator: () => window.app.getTextToVideoOperator(),
		getModels: (provider) => window.app.getTextToVideoModels(provider),
		saveOperator: (provider, model) => window.app.saveTextToVideoOperator(provider, model),
	},
	{
		id: MUSIC_CREATOR_OPERATOR_ID,
		label: OPERATOR_DEFINITIONS.musicCreator.name,
		required: false,
		getOperator: () => window.app.getMusicCreatorOperator(),
		getModels: (provider) => window.app.getMusicCreatorModels(provider),
		saveOperator: (provider, model) => window.app.saveMusicCreatorOperator(provider, model),
	},
];

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


const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY_LABEL = 'sk-************' as const;
const SETUP_STEPS: readonly SetupStep[] = ['presentation', 'providers', 'models'];

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
	const canSaveModelSetup =
		!loadingModels &&
		!savingConfig &&
		MODEL_SERVICE_DEFINITIONS.every(
			(service) => !service.required || getSelectedServiceModel(service.id) !== undefined
		);
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
		if (step !== 'models') return;

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

			goToStep('models');
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

	async function handleSaveServiceModels(): Promise<void> {
		if (!canSaveModelSetup) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			for (const service of MODEL_SERVICE_DEFINITIONS) {
				const selectedModel = getSelectedServiceModel(service.id);
				if (!selectedModel) {
					if (service.required) {
						throw new Error(`Could not save selection for ${service.label}.`);
					}
					continue;
				}

				const saved = await service.saveOperator(selectedModel.provider, selectedModel.model);
				if (!saved) {
					throw new Error(`Could not save the selected ${service.label} model.`);
				}
			}
			navigate('/home');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the selected model.'));
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
			void handleSaveServiceModels();
			return;
		}

		navigate('/home');
	}

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';
		if (step === 'models') return 'Get started';
		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (step === 'models') return !canSaveModelSetup;
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

		if (step === 'providers' && !canContinueProviders) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger render={<span className="inline-flex">{button}</span>} />
						<TooltipContent>Save an API key to continue.</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return button;
	}

	function renderPresentationStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
				<DomeWaveAnimation height={120} className="w-full max-w-sm" />
				<Badge variant="secondary" className="mt-5 h-6 rounded-md px-2.5 text-xs font-semibold">
					<Check className="size-3" />
					Ready in a minute
				</Badge>
				<h1 className="mt-5 text-3xl font-bold leading-none tracking-normal text-foreground">
					Welcome to {PRODUCT_NAME}
				</h1>
				<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
					Connect a provider, pick a model, and you're ready.
				</p>
			</div>
		);
	}

	function renderProviderStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Connect a provider
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Add an API key to get started. Keys are stored locally on your device.
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
							Keys are stored locally and never shared.
						</p>
					</div>
				</div>
			</div>
		);
	}

	function renderModelsStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Choose models
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Choose a model for each capability. You can change these anytime in Settings.
					</p>
				</div>

				<div className="mt-6 space-y-3">
					{MODEL_SERVICE_DEFINITIONS.map((service) => {
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

						return (
							<Card
								key={service.id}
								className="rounded-lg border-border bg-card py-0 shadow-none"
							>
								<CardContent className="space-y-3 p-3">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{service.label}
									</p>
									<div className="grid gap-3 sm:grid-cols-2">
										<SettingsField id={`${service.id}-provider`} label="Provider">
											<Select
												value={serviceState.providerId}
												onValueChange={(value) => handleServiceProviderChange(service.id, value)}
												disabled={loadingModels || serviceState.modelGroups.length === 0 || savingConfig}
											>
												<SelectTrigger id={`${service.id}-provider`} className="w-full text-xs">
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
										</SettingsField>
										<SettingsField id={`${service.id}-model`} label="Model">
											<Select
												value={serviceState.modelId}
												onValueChange={(value) => handleServiceModelChange(service.id, value)}
												disabled={loadingModels || availableModels.length === 0 || savingConfig}
											>
												<SelectTrigger id={`${service.id}-model`} className="w-full text-xs">
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
										</SettingsField>
									</div>
								</CardContent>
							</Card>
						);
					})}
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
