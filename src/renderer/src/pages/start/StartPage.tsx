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
import { type Model } from '../../../../shared/agents/service';
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


type AgentModelOption = {
	value: string;
	provider: PublicProvider;
	model: Model;
};


const PRODUCT_NAME = 'Friday';
const MASKED_API_KEY_LABEL = 'sk-************' as const;
const AGENT_MODEL_VALUE_SEPARATOR = '::';
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

function getAgentModelValue(providerId: string, modelId: string): string {
	return `${providerId}${AGENT_MODEL_VALUE_SEPARATOR}${modelId}`;
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
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [configProvider, setConfigProvider] = useState('');
	const [savedModelId, setSavedModelId] = useState('');
	const [agentModelGroups, setAgentModelGroups] = useState<ProviderModelGroup[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);
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
	const selectedAgentModelOption = agentModelOptions.find(
		(option) => option.value === selectedAgentModelValue
	);
	const selectedAgentModelGroup = agentModelGroups.find(
		(group) => group.provider.id === configProvider
	);
	const selectedAgentModels = selectedAgentModelGroup?.models ?? [];
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
				const [storedProviders, assistantOperator] = await Promise.all([
					window.app.getProviders(),
					window.app.getAssistantOperator(),
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
			} catch (error) {
				if (cancelled) return;
				setProviders([]);
				setConfigProvider('');
				setSavedModelId('');
				setErrorMessage(getErrorMessage(error, 'Could not load providers.'));
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
						(option) => option.provider.id === configProvider && option.model.id === savedModelId
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

	function handleOpenProviderLink(provider: ProviderCatalogItem): void {
		if (!provider.apiConfigurationUrl) return;
		openExternalUrl(provider.apiConfigurationUrl);
	}

	async function handleSaveAgentModel(): Promise<void> {
		if (!selectedAgentModelOption || !canSaveModelSetup) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAssistantOperator(
				selectedAgentModelOption.provider,
				selectedAgentModelOption.model
			);
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
			void handleSaveAgentModel();
			return;
		}

		navigate('/home');
	}

	function getPrimaryLabel(): string {
		if (step === 'presentation') return 'Get started';
		if (savingProviderId !== null || savingConfig) return 'Saving...';
		if (step === 'models') return 'Start using Friday';
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
						<TooltipContent>Add and save at least one API key to continue.</TooltipContent>
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
					Your personal AI assistant. Connect a provider, pick your models, and start working.
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
		return (
			<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						Choose a model
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						Pick the model {PRODUCT_NAME} will use as your main assistant. You can change this
						anytime in Settings.
					</p>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-2">
					<SettingsField id="agent-provider" label="Provider">
						<Select
							value={configProvider}
							onValueChange={handleAgentProviderChange}
							disabled={loadingModels || agentModelGroups.length === 0 || savingConfig}
						>
							<SelectTrigger id="agent-provider" className="w-full text-xs">
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
							<SelectTrigger id="agent-model" className="w-full text-xs">
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
