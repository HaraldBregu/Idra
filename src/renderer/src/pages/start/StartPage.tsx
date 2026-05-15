import React, { useEffect, useMemo, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	AudioWaveform,
	Bot,
	Check,
	Eye,
	Hand,
	KeyRound,
	LoaderCircle,
	Lock,
	MessageSquare,
	Mic,
	Pencil,
	Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import type { Model } from '../../../../shared/service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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

type SetupStep = 'welcome' | 'permissions' | 'providers' | 'models' | 'finish';

type PermissionId = 'microphone' | 'screen' | 'accessibility';

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

type VoiceOption = {
	id: string;
	name: string;
	description: string;
};

const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY = '********' as const;
const SETUP_STEPS: readonly SetupStep[] = [
	'welcome',
	'permissions',
	'providers',
	'models',
	'finish',
];

const STEP_TITLES: Record<SetupStep, string> = {
	welcome: 'Welcome',
	permissions: 'Permissions',
	providers: 'Providers',
	models: 'Models',
	finish: 'Finish',
};

const PERMISSION_ITEMS: readonly {
	id: PermissionId;
	title: string;
	description: string;
	icon: typeof Mic;
	required?: boolean;
}[] = [
	{
		id: 'microphone',
		title: 'Microphone',
		description: `So you can talk to ${PRODUCT_NAME}`,
		icon: Mic,
		required: true,
	},
	{
		id: 'screen',
		title: 'Screen reading',
		description: "To answer about what's on screen (optional)",
		icon: Eye,
	},
	{
		id: 'accessibility',
		title: 'Accessibility',
		description: 'To act on apps when you ask (optional)',
		icon: Hand,
	},
];

const PROVIDER_CATALOG: readonly ProviderCatalogItem[] = [
	{
		id: 'anthropic',
		name: 'Anthropic',
		capabilities: 'Chat',
		initial: 'A',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: true,
	},
	{
		id: 'openai',
		name: 'OpenAI',
		capabilities: 'Chat - Speech-to-text - Text-to-speech',
		initial: 'O',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: true,
	},
	{
		id: 'google',
		name: 'Google',
		capabilities: 'Chat - Speech-to-text',
		initial: 'G',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: false,
	},
	{
		id: 'elevenlabs',
		name: 'ElevenLabs',
		capabilities: 'Text-to-speech - Speech-to-text',
		initial: 'E',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: false,
	},
	{
		id: 'groq',
		name: 'Groq',
		capabilities: 'Chat - Speech-to-text',
		initial: 'Q',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: false,
	},
	{
		id: 'ollama',
		name: 'Local - Ollama',
		capabilities: 'auto',
		initial: '',
		swatchClassName: 'bg-muted text-muted-foreground',
		supported: false,
	},
];

const SPEECH_MODELS: readonly StaticModelOption[] = [
	{
		id: 'whisper-large-v3',
		name: 'Whisper Large v3',
		provider: 'OpenAI',
		description: 'Transcribes you when you talk',
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

const HOTKEY_OPTIONS = ['Cmd Shift Space', 'Cmd /', 'Opt Space', 'Fn'] as const;
const TONE_OPTIONS = ['Low-key', 'Direct', 'Warm', 'Witty'] as const;
const VOICE_OPTIONS: readonly VoiceOption[] = [
	{ id: 'wren', name: 'Wren', description: 'warm, low' },
	{ id: 'iris', name: 'Iris', description: 'crisp, neutral' },
	{ id: 'juno', name: 'Juno', description: 'bright, brisk' },
];

function normalizeProvider(provider: Provider, index: number): ProviderOption {
	const value = provider.id || `provider-${index}`;
	const label = provider.name || value;

	return {
		label,
		value,
	};
}

const providerOptions = DEFAULT_PROVIDERS.map((provider, index) =>
	normalizeProvider(provider, index)
);
const supportedProviderIds = new Set(providerOptions.map((provider) => provider.value));
const actionableProviderCatalog = PROVIDER_CATALOG.filter((provider) =>
	supportedProviderIds.has(provider.id)
);

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}

	return fallback;
}

function getProviderCatalogItem(providerId: string): ProviderCatalogItem {
	return (
		PROVIDER_CATALOG.find((provider) => provider.id === providerId) ?? {
			id: providerId,
			name: providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId,
			capabilities: 'Chat',
			initial: providerId.slice(0, 1).toUpperCase(),
			swatchClassName: 'bg-muted text-muted-foreground',
			supported: supportedProviderIds.has(providerId),
		}
	);
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

function AssistantOrb(): React.JSX.Element {
	return (
		<div className="relative flex size-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg motion-safe:animate-[pulse_3s_ease-in-out_infinite]">
			<div className="absolute size-20 rounded-full bg-primary-foreground/20 motion-safe:animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
			<Sparkles className="relative size-10 motion-safe:animate-[spin_12s_linear_infinite]" strokeWidth={2.7} />
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

function FeaturePill({
	icon: Icon,
	label,
}: {
	readonly icon: typeof MessageSquare;
	readonly label: string;
}): React.JSX.Element {
	return (
		<div className="flex min-w-0 flex-col items-center gap-2 text-center">
			<div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
				<Icon className="size-5" strokeWidth={1.9} />
			</div>
			<p className="whitespace-nowrap text-sm font-semibold leading-tight text-muted-foreground">
				{label}
			</p>
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

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [step, setStep] = useState<SetupStep>('welcome');
	const [permissions, setPermissions] = useState<Record<PermissionId, boolean>>({
		microphone: true,
		screen: false,
		accessibility: false,
	});
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
	const [models, setModels] = useState<Model[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);
	const [selectedSpeechModel, setSelectedSpeechModel] = useState(SPEECH_MODELS[0]?.id ?? '');
	const [selectedTtsModel, setSelectedTtsModel] = useState(TTS_MODELS[0]?.id ?? '');
	const [selectedHotkey, setSelectedHotkey] = useState<(typeof HOTKEY_OPTIONS)[number]>(
		HOTKEY_OPTIONS[0]
	);
	const [selectedVoice, setSelectedVoice] = useState('juno');
	const [selectedTone, setSelectedTone] = useState<(typeof TONE_OPTIONS)[number]>('Witty');
	const [openAtLogin, setOpenAtLogin] = useState(true);
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const stepIndex = SETUP_STEPS.indexOf(step);
	const stepNumber = stepIndex + 1;
	const hasProviderDraft = providerEntries.some(
		(entry) => entry.apiKeySaved || entry.apiKey.trim().length > 0
	);
	const canContinueProviders = hasProviderDraft && !savingProviderId;
	const selectedProvider = providers.find((provider) => provider.id === configProvider);
	const configProviderName = selectedProvider?.name ?? configProvider;
	const selectedModelName = models.find((model) => model.id === selectedModel)?.name ?? selectedModel;
	const modelCountLabel = loadingModels
		? 'Loading models...'
		: models.length === 0
			? 'No models available'
			: `${models.length} models available`;
	const canSaveAssistantModel =
		configProvider.length > 0 &&
		selectedModel.length > 0 &&
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
				const [storedProviders, assistantService] = await Promise.all([
					window.app.getProviders(),
					window.app.getAssistantService(),
				]);
				if (cancelled) return;

				const selectableProviders = storedProviders.filter((provider) =>
					supportedProviderIds.has(provider.id)
				);
				const preferredProvider =
					selectableProviders.find(
						(provider) => provider.id === assistantService?.provider.id
					) ??
					selectableProviders.find((provider) => connectedProviderIds.has(provider.id)) ??
					selectableProviders[0];

				setProviders(selectableProviders);
				setConfigProvider(preferredProvider?.id ?? '');
				setSavedModelId(assistantService?.model.id ?? '');
			} catch (error) {
				if (cancelled) return;

				setProviders([]);
				setConfigProvider('');
				setSavedModelId('');
				setErrorMessage(getErrorMessage(error, 'Could not load assistant providers.'));
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
			const provider = providers.find((item) => item.id === configProvider);

			if (!provider) {
				setModels([]);
				setSelectedModel('');
				return;
			}

			setLoadingModels(true);
			setErrorMessage('');
			try {
				const providerModels = await window.app.getModels(provider);
				if (cancelled) return;

				setModels(providerModels);
				const savedModel = providerModels.find((model) => model.id === savedModelId);
				setSelectedModel(savedModel?.id ?? providerModels[0]?.id ?? '');
			} catch (error) {
				if (cancelled) return;

				setModels([]);
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
	}, [configProvider, providers, savedModelId, step]);

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

	function handleConfigProviderChange(value: string | null): void {
		setErrorMessage('');
		setConfigProvider(value ?? '');
		setSavedModelId('');
		setModels([]);
		setSelectedModel('');
	}

	async function handleSaveAssistantModel(): Promise<void> {
		const provider = providers.find((item) => item.id === configProvider);
		const model = models.find((item) => item.id === selectedModel);
		if (!provider || !model || !canSaveAssistantModel) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAssistantService(provider, model);
			goToStep('finish');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the assistant model.'));
		} finally {
			setSavingConfig(false);
		}
	}

	function handlePrimaryAction(): void {
		if (step === 'welcome') {
			goToStep('permissions');
			return;
		}

		if (step === 'permissions') {
			goToStep('providers');
			return;
		}

		if (step === 'providers') {
			void handleContinueProviders();
			return;
		}

		if (step === 'models') {
			void handleSaveAssistantModel();
			return;
		}

		navigate('/home');
	}

	function getPrimaryLabel(): string {
		if (step === 'welcome') return 'Get started';
		if (step === 'finish') return `Open ${PRODUCT_NAME}`;
		if (savingProviderId !== null || savingConfig) return 'Saving...';

		return 'Continue';
	}

	function isPrimaryDisabled(): boolean {
		if (step === 'providers') return !canContinueProviders;
		if (step === 'models') return !canSaveAssistantModel;

		return isBusy;
	}

	function renderWelcomeStep(): React.JSX.Element {
		return (
			<div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-6">
				<AssistantOrb />
				<h1 className="mt-6 text-3xl font-bold leading-none tracking-normal text-foreground">
					Hello, Anna
				</h1>
				<p className="mt-4 max-w-md text-base font-medium leading-relaxed text-muted-foreground">
					{PRODUCT_NAME} is a small assistant that lives in your menu bar. Ask her
					things by typing or just by talking.
				</p>
				<div className="mt-8 grid w-full max-w-md grid-cols-3 gap-4">
					<FeaturePill icon={MessageSquare} label="Type to ask" />
					<FeaturePill icon={Mic} label="Hold to speak" />
					<FeaturePill icon={Lock} label="Stays on your Mac" />
				</div>
			</div>
		);
	}

	function renderPermissionsStep(): React.JSX.Element {
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						A couple of permissions
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						{PRODUCT_NAME} only listens while you are holding the mic. Nothing leaves
						your Mac without you asking.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					{PERMISSION_ITEMS.map((permission) => {
						const Icon = permission.icon;
						const allowed = permissions[permission.id];

						return (
							<Card
								key={permission.id}
								className="rounded-lg border-border bg-card py-0 shadow-none"
							>
								<CardContent className="grid min-h-12 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 p-2.5">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
										<Icon className="size-4" strokeWidth={2.1} />
									</div>
									<div className="min-w-0 flex-1">
										<h2 className="text-sm font-semibold leading-tight text-foreground">
											{permission.title}
										</h2>
										<p className="mt-0.5 text-xs font-medium leading-tight text-muted-foreground">
											{permission.description}
										</p>
									</div>
									<div className="flex shrink-0 justify-end">
										{allowed ? (
											<Badge variant="secondary" className="h-6 rounded-md px-2 text-xs font-semibold">
												<Check className="size-3" />
												Allowed
											</Badge>
										) : (
											<Button
												type="button"
												variant="outline"
												size="xs"
												onClick={() => {
													setPermissions((current) => ({
														...current,
														[permission.id]: true,
													}));
												}}
											>
												Allow
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>

				<div className="mt-auto pt-4">
					<div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground">
						<Lock className="size-4 shrink-0" />
						<p className="text-xs font-medium leading-snug">
							Audio is transcribed on-device. You can change all of this later in
							Settings.
						</p>
					</div>
				</div>
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
						{PRODUCT_NAME} uses your own API keys. Connect at least one - keys are
						kept in your macOS Keychain.
					</p>
				</div>

				<div className="mt-4 space-y-2">
					{PROVIDER_CATALOG.map((provider) => {
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
							Keys are encrypted in Keychain and never sent to us. You can revoke any
							provider anytime.
						</p>
					</div>
				</div>
			</div>
		);
	}

	function renderModelsStep(): React.JSX.Element {
		const selectedCatalog = getProviderCatalogItem(configProvider);
		const openAiConnected = connectedProviderIds.has('openai');

		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Choose your models
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Pick a model for each role. Only models from providers you connected
						appear.
					</p>
				</div>

				<div className="mt-4 space-y-4">
					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Assistant
						</Label>
						<Select
							value={configProvider}
							onValueChange={handleConfigProviderChange}
							disabled={providers.length === 0 || savingConfig}
						>
							<SelectTrigger
								id="assistant-provider"
								className="!h-12 w-full rounded-lg border-border bg-card px-3 text-left shadow-none"
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
											{configProviderName || 'No provider'} - The brain that answers your
											questions
										</p>
									</div>
								</div>
							</SelectTrigger>
							<SelectContent>
								{providers.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={selectedModel}
							onValueChange={(value) => {
								setErrorMessage('');
								setSelectedModel(value ?? '');
							}}
							disabled={loadingModels || models.length === 0 || savingConfig}
						>
							<SelectTrigger
								id="assistant-model"
								className="!h-8 w-full rounded-lg border-border bg-card px-3 text-xs font-semibold text-foreground"
							>
								<SelectValue>
									{selectedModelName ||
										(loadingModels ? 'Loading models...' : 'Select an assistant model')}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{models.map((model) => (
									<SelectItem key={model.id} value={model.id}>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{openAiConnected ? (
						<StaticModelSelect
							id="speech-model"
							label="Speech-to-text"
							value={selectedSpeechModel}
							options={SPEECH_MODELS}
							onValueChange={setSelectedSpeechModel}
						/>
					) : (
						<Card className="rounded-lg border-dashed border-border bg-card/70 py-0 shadow-none">
							<CardContent className="flex min-h-12 items-center gap-2 p-3 text-muted-foreground">
								<Mic className="size-4 shrink-0" />
								<p className="text-xs font-medium">
									Connect OpenAI to choose a speech-to-text model.
								</p>
							</CardContent>
						</Card>
					)}

					<StaticModelSelect
						id="tts-model"
						label="Text-to-speech"
						value={selectedTtsModel}
						options={TTS_MODELS}
						onValueChange={setSelectedTtsModel}
					/>
				</div>
			</div>
		);
	}

	function renderFinishStep(): React.JSX.Element {
		return (
			<div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Almost done
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						A hotkey and a personality. You can change all of this later.
					</p>
				</div>

				<div className="mt-4 space-y-4">
					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Hotkey
						</Label>
						<div className="flex flex-wrap gap-3">
							{HOTKEY_OPTIONS.map((hotkey) => (
								<Button
									key={hotkey}
									type="button"
									variant={selectedHotkey === hotkey ? 'default' : 'outline'}
									size="xs"
									onClick={() => setSelectedHotkey(hotkey)}
								>
									{hotkey}
								</Button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Voice
						</Label>
						<div className="grid gap-2 md:grid-cols-3">
							{VOICE_OPTIONS.map((voice) => {
								const selected = selectedVoice === voice.id;

								return (
									<Button
										key={voice.id}
										type="button"
										variant={selected ? 'default' : 'outline'}
										className="h-24 flex-col p-3 text-center"
										onClick={() => setSelectedVoice(voice.id)}
									>
										<div className="flex size-8 items-center justify-center rounded-full">
											<AudioWaveform className="size-4" />
										</div>
										<span className="mt-2 text-sm font-bold leading-tight">
											{voice.name}
										</span>
										<span className="mt-1 text-xs font-medium leading-tight text-muted-foreground">
											{voice.description}
										</span>
									</Button>
								);
							})}
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
							Tone
						</Label>
						<div className="flex flex-wrap gap-3">
							{TONE_OPTIONS.map((tone) => (
								<Button
									key={tone}
									type="button"
									variant={selectedTone === tone ? 'default' : 'outline'}
									size="xs"
									className="rounded-full"
									onClick={() => setSelectedTone(tone)}
								>
									{tone}
								</Button>
							))}
						</div>
					</div>

					<Card className="rounded-lg border-border bg-card py-0 shadow-none">
						<CardContent className="flex min-h-12 items-center gap-3 p-3">
							<div className="min-w-0 flex-1">
								<h2 className="text-sm font-semibold leading-tight text-foreground">
									Open {PRODUCT_NAME} when I log in
								</h2>
								<p className="mt-0.5 truncate text-xs font-medium leading-tight text-muted-foreground">
									Lives in the menu bar; invisible until you summon her
								</p>
							</div>
							<Switch
								checked={openAtLogin}
								onCheckedChange={setOpenAtLogin}
								aria-label={`Open ${PRODUCT_NAME} when I log in`}
							/>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	function renderStepContent(): React.JSX.Element {
		if (step === 'welcome') return renderWelcomeStep();
		if (step === 'permissions') return renderPermissionsStep();
		if (step === 'providers') return renderProviderStep();
		if (step === 'models') return renderModelsStep();

		return renderFinishStep();
	}

	return (
		<main className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
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
						Step {stepNumber} of {SETUP_STEPS.length} - {STEP_TITLES[step]}
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
						) : step === 'finish' ? (
							<Bot className="size-3.5" />
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
