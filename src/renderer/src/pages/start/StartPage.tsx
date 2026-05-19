import React, { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	Bot,
	ChevronDown,
	Check,
	ImageIcon,
	KeyRound,
	LoaderCircle,
	Mic,
	Pencil,
	Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import {
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	type Model,
} from '../../../../shared/service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DomeWaveAnimation } from '@/components/ui/dome-wave-animation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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

type SetupStep = 'welcome' | 'providers' | 'models';
type ModelSetupCardId = 'friday' | 'voice-input' | 'voice-output' | 'image-creator';

type ProviderCatalogItem = {
	id: string;
	name: string;
	capabilities: string;
	initial: string;
	swatchClassName: string;
	supported: boolean;
};

type StaticModelOption = {
	id: string;
	name: string;
	provider: string;
	description: string;
	initial: string;
	swatchClassName: string;
};

type ProviderModelGroup = {
	provider: PublicProvider;
	models: Model[];
};

type AgentModelOption = {
	value: string;
	provider: PublicProvider;
	catalog: ProviderCatalogItem;
	model: Model;
};

const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY = '********' as const;
const AGENT_MODEL_VALUE_SEPARATOR = '::';
const SETUP_STEPS: readonly SetupStep[] = [
	'welcome',
	'providers',
	'models',
];

const STEP_TITLES: Record<SetupStep, string> = {
	welcome: 'Welcome',
	providers: 'Providers',
	models: 'Models',
};

const SPEECH_MODELS: readonly StaticModelOption[] = [
	{
		id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
		name: 'GPT Realtime Whisper',
		provider: 'OpenAI',
		description: 'Streams live dictation into chat',
		initial: 'O',
		swatchClassName: 'bg-muted text-muted-foreground',
	},
];

const TTS_MODELS: readonly StaticModelOption[] = [
	{
		id: 'rachel-multilingual',
		name: 'Rachel - multilingual',
		provider: 'ElevenLabs',
		description: `${PRODUCT_NAME} speaks with this voice`,
		initial: 'E',
		swatchClassName: 'bg-muted text-muted-foreground',
	},
];

function normalizeProvider(provider: Provider, index: number): ProviderOption {
	const value = provider.id || `provider-${index}`;
	const label = provider.name || value;

	return {
		label,
		value,
	};
}

function providerInitial(name: string): string {
	const words = name
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	const initials = words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');

	return initials || name.slice(0, 1).toUpperCase();
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
		initial: providerInitial(provider.name),
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: true,
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
			initial: providerId.slice(0, 1).toUpperCase(),
			swatchClassName: 'bg-muted text-muted-foreground',
			supported: supportedProviderIds.has(providerId),
		}
	);
}

function getAgentModelValue(providerId: string, modelId: string): string {
	return `${providerId}${AGENT_MODEL_VALUE_SEPARATOR}${modelId}`;
}

function ProviderMark({
	initial,
	className,
}: {
	readonly initial: string;
	readonly className: string;
}): React.JSX.Element {
	if (!initial) {
		return (
			<div
				className={cn(
					'flex size-8 shrink-0 items-center justify-center rounded-md',
					className
				)}
			>
				<div className="size-4 rounded-full border-2 border-current/80" />
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
				className
			)}
		>
			{initial}
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

function StaticModelSelect({
	id,
	label,
	value,
	options,
	onValueChange,
}: {
	readonly id: string;
	readonly label: string;
	readonly value: string;
	readonly options: readonly StaticModelOption[];
	readonly onValueChange: (value: string) => void;
}): React.JSX.Element {
	const selected = options.find((option) => option.id === value) ?? options[0];

	return (
		<div className="space-y-2">
			<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
				{label}
			</Label>
			<Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? '')}>
				<SelectTrigger
					id={id}
					className="!h-12 w-full rounded-lg border-border bg-card px-3 text-left shadow-none"
				>
					<SelectValue className="sr-only" />
					<div className="flex min-w-0 items-center gap-2.5">
						<ProviderMark
							initial={selected.initial}
							className={selected.swatchClassName}
						/>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold leading-tight text-foreground">
								{selected.name}
							</p>
							<p className="truncate text-xs font-medium text-muted-foreground">
								{selected.provider} - {selected.description}
							</p>
						</div>
					</div>
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.id} value={option.id}>
							{option.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function ModelSetupCard({
	id,
	title,
	description,
	status,
	icon: Icon,
	open,
	onToggle,
	children,
}: {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly status: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly open: boolean;
	readonly onToggle: () => void;
	readonly children: React.ReactNode;
}): React.JSX.Element {
	return (
		<Card className="rounded-lg border-border bg-card py-0 shadow-none">
			<CardContent className="p-0">
				<button
					type="button"
					aria-expanded={open}
					aria-controls={id}
					className="flex w-full items-center gap-3 px-3 py-3 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
					onClick={onToggle}
				>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
						<Icon className="size-4" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block truncate text-sm font-semibold leading-tight text-foreground">
							{title}
						</span>
						<span className="mt-1 block truncate text-xs font-medium leading-tight text-muted-foreground">
							{description}
						</span>
					</span>
					<span className="hidden shrink-0 text-xs font-medium text-muted-foreground sm:block">
						{status}
					</span>
					<ChevronDown
						className={cn(
							'size-4 shrink-0 text-muted-foreground transition-transform',
							open && 'rotate-180'
						)}
					/>
				</button>
				{open ? (
					<div id={id} className="border-t border-border px-3 py-3">
						{children}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [step, setStep] = useState<SetupStep>('welcome');
	const [expandedModelCardId, setExpandedModelCardId] =
		useState<ModelSetupCardId>('friday');
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
	const [selectedSpeechModel, setSelectedSpeechModel] = useState(SPEECH_MODELS[0]?.id ?? '');
	const [selectedTtsModel, setSelectedTtsModel] = useState(TTS_MODELS[0]?.id ?? '');
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
	const selectedProvider =
		selectedAgentModelOption?.provider ??
		providers.find((provider) => provider.id === configProvider);
	const configProviderName = selectedProvider?.name ?? configProvider;
	const selectedModelName = selectedAgentModelOption?.model.name ?? selectedModel;
	const modelCountLabel = loadingModels
		? 'Loading models...'
		: agentModelOptions.length === 0
			? 'No models available'
			: `${agentModelOptions.length} models available`;
	const canSaveAgentModel =
		selectedAgentModelOption !== undefined &&
		!loadingModels &&
		!savingConfig;
	const isBusy = savingProviderId !== null || savingConfig;
	const connectedProviderIds = useMemo(
		() =>
			new Set(
				providerEntries
					.filter((entry) => entry.apiKeySaved)
					.map((entry) => entry.providerId)
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

						return {
							providerId: provider.id,
							apiKey: saved ? MASKED_API_KEY : current?.apiKey ?? '',
							apiKeySaved: saved,
							editing: saved ? false : current?.editing ?? (!hasSavedProvider && index === 0),
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
				const [storedProviders, agentService] = await Promise.all([
					window.app.getProviders(),
					window.app.getAgentService(),
				]);
				if (cancelled) return;

				const selectableProviders = storedProviders.filter((provider) =>
					supportedProviderIds.has(provider.id)
				);
				const preferredProvider =
					selectableProviders.find(
						(provider) => provider.id === agentService?.provider.id
					) ??
					selectableProviders.find((provider) => connectedProviderIds.has(provider.id)) ??
					selectableProviders[0];

				setProviders(selectableProviders);
				setConfigProvider(preferredProvider?.id ?? '');
				setSavedModelId(agentService?.model.id ?? '');
			} catch (error) {
				if (cancelled) return;

				setProviders([]);
				setConfigProvider('');
				setSavedModelId('');
				setErrorMessage(getErrorMessage(error, 'Could not load agent providers.'));
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
				setSelectedModel('');
				return;
			}

			setLoadingModels(true);
			setErrorMessage('');
			try {
				const nextAgentGroups: ProviderModelGroup[] = [];
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
				}

				if (cancelled) return;

				setAgentModelGroups(nextAgentGroups);

				const agentOptions = nextAgentGroups.flatMap((group) =>
					group.models.map((model) => ({ provider: group.provider, model }))
				);
				const preferredAgentOption =
					agentOptions.find(
						(option) =>
							option.provider.id === configProvider && option.model.id === savedModelId
					) ??
					agentOptions.find((option) => option.provider.id === configProvider) ??
					agentOptions[0];

				setConfigProvider(preferredAgentOption?.provider.id ?? '');
				setSelectedModel(preferredAgentOption?.model.id ?? '');

				if (!preferredAgentOption && firstError) {
					setErrorMessage(getErrorMessage(firstError, 'Could not load models.'));
				}
			} catch (error) {
				if (cancelled) return;

				setAgentModelGroups([]);
				setSelectedModel('');
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
	}, [providers, savedModelId, step]);

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
		updateProviderEntry(providerId, {
			apiKey,
		});
	}

	async function saveProviderEntry(providerId: string): Promise<boolean> {
		const entry = providerEntries.find((item) => item.providerId === providerId);
		if (!entry) return false;

		if (entry.apiKeySaved && entry.apiKey === MASKED_API_KEY) {
			updateProviderEntry(providerId, { editing: false });
			return true;
		}

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
				apiKey: MASKED_API_KEY,
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
			const entriesToSave = providerEntries.filter((entry) => {
				return (
					entry.apiKey.trim().length > 0 &&
					(!entry.apiKeySaved || entry.apiKey !== MASKED_API_KEY)
				);
			});

			for (const entry of entriesToSave) {
				await window.app.setProviderApiKey(entry.providerId, entry.apiKey.trim());
			}

			if (entriesToSave.length > 0) {
				const savedProviderIds = new Set(entriesToSave.map((entry) => entry.providerId));
				setProviderEntries((entries) =>
					entries.map((entry) =>
						savedProviderIds.has(entry.providerId)
							? {
									...entry,
									apiKey: MASKED_API_KEY,
									apiKeySaved: true,
									editing: false,
								}
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

	function handleAgentModelChange(value: string | null): void {
		const option = agentModelOptions.find((item) => item.value === value);
		if (!option) return;

		setErrorMessage('');
		setConfigProvider(option.provider.id);
		setSelectedModel(option.model.id);
	}

	async function handleSaveAgentModel(): Promise<void> {
		if (!selectedAgentModelOption || !canSaveAgentModel) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAgentService(
				selectedAgentModelOption.provider,
				selectedAgentModelOption.model
			);
			const openAiProvider = providers.find((provider) => provider.id === 'openai');
			const selectedSpeechOption = SPEECH_MODELS.find(
				(model) => model.id === selectedSpeechModel
			);
			if (openAiProvider && selectedSpeechOption) {
				await window.app.saveSpeechTranscriberService(openAiProvider, {
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
		if (step === 'welcome') {
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
		if (step === 'welcome') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';

		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (step === 'models') return !canSaveAgentModel;

		return isBusy;
	}

	function renderWelcomeStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
				<DomeWaveAnimation height={120} className="w-full max-w-sm" />
				<Badge
					variant="secondary"
					className="mt-5 h-6 rounded-md px-2.5 text-xs font-semibold"
				>
					<Check className="size-3" />
					Setup takes about a minute
				</Badge>
				<h1 className="mt-5 text-3xl font-bold leading-none tracking-normal text-foreground">
					Welcome to {PRODUCT_NAME}
				</h1>
				<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
					Let&apos;s get your assistant ready. Connect one AI provider, choose the
					model {PRODUCT_NAME} should use, and add the tools you want help with.
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
						Add one API key so {PRODUCT_NAME} can start answering your requests.
						Your key is saved locally in {PRODUCT_NAME}'s app data folder.
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
							!!entry &&
							!savingThisProvider &&
							((entry.apiKeySaved && entry.apiKey === MASKED_API_KEY) ||
								entry.apiKey.trim().length > 0);

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
										<ProviderMark
											initial={provider.initial}
											className={provider.swatchClassName}
										/>
										<div className="min-w-0 flex-1">
											<h2 className="truncate text-sm font-semibold leading-tight text-foreground">
												{provider.name}
											</h2>
											<p className="truncate text-xs font-medium leading-tight text-muted-foreground">
												{connected && entry?.apiKey === MASKED_API_KEY
													? 'sk-************'
													: provider.capabilities}
											</p>
										</div>
										<div className="flex shrink-0 justify-end gap-2">
											{provider.supported ? (
												connected && !editing ? (
													<div className="flex items-center gap-2">
														<Badge
															variant="secondary"
															className="h-6 rounded-md px-2 text-xs font-semibold"
														>
															<Check className="size-3" />
															Connected
														</Badge>
														<Button
															type="button"
															variant="ghost"
															size="icon-xs"
															aria-label={`Edit ${provider.name} API key`}
															onClick={() => {
																updateProviderEntry(provider.id, {
																	editing: true,
																	apiKey: MASKED_API_KEY,
																});
															}}
														>
															<Pencil className="size-3.5" />
														</Button>
													</div>
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
												<Button
													type="button"
													variant="outline"
													size="xs"
													disabled
												>
													Soon
												</Button>
											)}
										</div>
									</div>

									{provider.supported && editing && entry ? (
										<div className="flex items-center gap-2 px-3 pb-3">
											<Input
												autoComplete="off"
												className="h-8 flex-1 rounded-md border-input bg-card px-2.5 text-xs font-semibold placeholder:text-muted-foreground"
												disabled={savingThisProvider}
												onChange={(event) => {
													handleProviderApiKeyChange(provider.id, event.target.value);
												}}
												placeholder="sk-..."
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
														apiKey: entry.apiKeySaved ? MASKED_API_KEY : '',
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
							Keys stay in {PRODUCT_NAME}'s local app data folder and are only used
							for providers you connect. You can revoke them anytime.
						</p>
					</div>
				</div>
			</div>
		);
	}

	function renderModelsStep(): React.JSX.Element {
		const selectedCatalog =
			selectedAgentModelOption?.catalog ?? getProviderCatalogItem(configProvider);
		const openAiConnected = connectedProviderIds.has('openai');
		const selectedSpeechOption =
			SPEECH_MODELS.find((option) => option.id === selectedSpeechModel) ?? SPEECH_MODELS[0];
		const selectedTtsOption =
			TTS_MODELS.find((option) => option.id === selectedTtsModel) ?? TTS_MODELS[0];
		const toggleModelCard = (cardId: ModelSetupCardId): void => {
			setExpandedModelCardId((current) => (current === cardId ? 'friday' : cardId));
		};

		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Configure your AI setup
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Choose the models Friday will use for chat, voice, and creative work.
						Only connected providers appear.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					<ModelSetupCard
						id="friday-assistant-model"
						title={`${PRODUCT_NAME} Assistant`}
						description="Answers questions, plans work, and uses tools."
						status={selectedModelName || modelCountLabel}
						icon={Bot}
						open={expandedModelCardId === 'friday'}
						onToggle={() => toggleModelCard('friday')}
					>
						<div className="space-y-2">
							<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
								Model
							</Label>
							<Select
								value={selectedAgentModelValue}
								onValueChange={handleAgentModelChange}
								disabled={loadingModels || agentModelOptions.length === 0 || savingConfig}
							>
								<SelectTrigger
									id="agent-model"
									className="!h-14 w-full rounded-lg border-border bg-card px-3 text-left shadow-none"
								>
									<SelectValue className="sr-only" />
									<div className="flex min-w-0 items-center gap-2.5">
										<ProviderMark
											initial={selectedCatalog.initial}
											className={selectedCatalog.swatchClassName}
										/>
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold leading-tight text-foreground">
												{selectedModelName || modelCountLabel}
											</p>
											<p className="truncate text-xs font-medium text-muted-foreground">
												{configProviderName || 'No provider'} - Chat, reasoning, and tool use
											</p>
										</div>
									</div>
								</SelectTrigger>
								<SelectContent align="start" className="rounded-lg p-1">
									{agentModelGroups.map((group) => {
										const catalog = getProviderCatalogItem(group.provider.id);

										return (
											<SelectGroup key={group.provider.id}>
												<SelectLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
													<ProviderMark
														initial={catalog.initial}
														className={cn(
															catalog.swatchClassName,
															'size-4 rounded-full text-[0.625rem]'
														)}
													/>
													{catalog.name}
												</SelectLabel>
												{group.models.map((model) => {
													const value = getAgentModelValue(group.provider.id, model.id);
													const selected = value === selectedAgentModelValue;

													return (
														<SelectItem
															key={value}
															value={value}
															className={cn(
																'h-10 px-2 py-0 pr-8 text-sm font-semibold',
																selected && 'bg-accent text-accent-foreground'
															)}
														>
															<span className="flex min-w-0 items-center gap-2">
																<span
																	className={cn(
																		'flex size-4 shrink-0 items-center justify-center rounded-full border border-border',
																		selected &&
																			'rounded-md border-primary bg-primary text-primary-foreground'
																	)}
																>
																	{selected ? <Check className="size-3" /> : null}
																</span>
																<span className="truncate">{model.name}</span>
															</span>
														</SelectItem>
													);
												})}
											</SelectGroup>
										);
									})}
								</SelectContent>
							</Select>
						</div>
					</ModelSetupCard>

					<ModelSetupCard
						id="voice-input-model"
						title="Voice Input"
						description="Transcribes your microphone into text."
						status={openAiConnected ? selectedSpeechOption?.name ?? 'Ready' : 'OpenAI required'}
						icon={Mic}
						open={expandedModelCardId === 'voice-input'}
						onToggle={() => toggleModelCard('voice-input')}
					>
						{openAiConnected ? (
							<StaticModelSelect
								id="speech-model"
								label="Transcription model"
								value={selectedSpeechModel}
								options={SPEECH_MODELS}
								onValueChange={setSelectedSpeechModel}
							/>
						) : (
							<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
								<Mic className="size-4 shrink-0" />
								<p className="text-xs font-medium leading-snug">
									Connect OpenAI to enable live speech transcription.
								</p>
							</div>
						)}
					</ModelSetupCard>

					<ModelSetupCard
						id="voice-output-model"
						title="Voice Output"
						description="Chooses the voice Friday uses when speaking."
						status={selectedTtsOption?.name ?? 'Not selected'}
						icon={Volume2}
						open={expandedModelCardId === 'voice-output'}
						onToggle={() => toggleModelCard('voice-output')}
					>
						<StaticModelSelect
							id="tts-model"
							label="Voice model"
							value={selectedTtsModel}
							options={TTS_MODELS}
							onValueChange={setSelectedTtsModel}
						/>
					</ModelSetupCard>

					<ModelSetupCard
						id="image-creator-model"
						title="Image Creator"
						description="Generates and edits images when image models are available."
						status="Coming soon"
						icon={ImageIcon}
						open={expandedModelCardId === 'image-creator'}
						onToggle={() => toggleModelCard('image-creator')}
					>
						<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
							<ImageIcon className="size-4 shrink-0" />
							<p className="text-xs font-medium leading-snug">
								Image creation is not configurable yet. It will appear here when an
								image provider is available.
							</p>
						</div>
					</ModelSetupCard>
				</div>
			</div>
		);
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'welcome') return renderWelcomeStep();
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
					{step !== 'welcome' ? (
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
