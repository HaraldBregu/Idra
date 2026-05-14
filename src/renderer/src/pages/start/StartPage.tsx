import React, { useEffect, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	Bot,
	ChevronLeft,
	LoaderCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import type { Model } from '../../../../shared/service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

type ProviderOption = {
	label: string;
	value: string;
};

type SetupStep = 'api-key' | 'model';

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

const MASKED_API_KEY = '********' as const;

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message;
	}

	return fallback;
}

const StartPage: React.FC = () => {
	const navigate = useNavigate();
	const [step, setStep] = useState<SetupStep>('api-key');
	const [apiKey, setApiKey] = useState('');
	const [apiKeySaved, setApiKeySaved] = useState(false);
	const [selectedProvider, setSelectedProvider] = useState(providerOptions[0]?.value ?? '');
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [configProvider, setConfigProvider] = useState('');
	const [savedModelId, setSavedModelId] = useState('');
	const [models, setModels] = useState<Model[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);
	const [savingApiKey, setSavingApiKey] = useState(false);
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const canContinue =
		selectedProvider.length > 0 && (apiKeySaved || apiKey.trim().length > 0) && !savingApiKey;
	const canFinish = configProvider.length > 0 && selectedModel.length > 0 && !savingConfig;
	const selectedProviderName =
		providerOptions.find((provider) => provider.value === selectedProvider)?.label ??
		selectedProvider;
	const configProviderName =
		providers.find((provider) => provider.id === configProvider)?.name ?? configProvider;
	const stepNumber = step === 'api-key' ? 1 : 2;
	const modelCountLabel = loadingModels
		? 'Loading models...'
		: models.length === 0
			? 'No models available'
			: `${models.length} models available`;
	const selectedModelName =
		models.find((model) => model.id === selectedModel)?.name ?? selectedModel;
	const formTitle = step === 'model' ? 'Choose the default model' : 'Connect your provider';
	const formDescription =
		step === 'model'
			? 'Pick the model Friday uses when a new assistant run starts.'
			: 'Save access for the provider Friday should use.';
	const setupStatus =
		step === 'model'
			? selectedModelName
				? `${configProviderName} - ${selectedModelName}`
				: modelCountLabel
			: apiKeySaved
				? `${selectedProviderName} access saved`
				: `${selectedProviderName} selected`;

	useEffect(() => {
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
			try {
				const storedProviders = await window.app.getProviders();
				if (cancelled) return;

				const providerImplemented = storedProviders.some((provider) => {
					return provider.id.trim().toLowerCase() === selectedProvider.trim().toLowerCase();
				});
				const saved = providerImplemented
					? await window.app.isProviderApiKeySaved(selectedProvider)
					: false;
				if (cancelled) return;

				setApiKeySaved(saved);
				setApiKey(saved ? MASKED_API_KEY : '');
			} catch (error) {
				if (cancelled) return;

				setApiKeySaved(false);
				setApiKey('');
				setErrorMessage(getErrorMessage(error, 'Could not check saved provider access.'));
			}
		}

		void loadApiKeyStatus();

		return () => {
			cancelled = true;
		};
	}, [selectedProvider]);

	useEffect(() => {
		if (step !== 'model') return;

		let cancelled = false;

		async function loadProviders(): Promise<void> {
			try {
				const [storedProviders, assistantService] = await Promise.all([
					window.app.getProviders(),
					window.app.getAssistantService(),
				]);
				if (cancelled) return;

				setProviders(storedProviders);
				const preferredProvider =
					storedProviders.find((provider) => provider.id === assistantService?.provider.id) ??
					storedProviders.find((provider) => provider.id === selectedProvider) ??
					storedProviders[0];
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
	}, [selectedProvider, step]);

	useEffect(() => {
		if (step !== 'model') return;

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

	async function handleContinue(): Promise<void> {
		if (!canContinue) return;

		setSavingApiKey(true);
		setErrorMessage('');
		try {
			if (!apiKeySaved || apiKey !== MASKED_API_KEY) {
				await window.app.setProviderApiKey(selectedProvider, apiKey.trim());
			}

			setStep('model');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the provider API key.'));
		} finally {
			setSavingApiKey(false);
		}
	}

	function handleConfigProviderChange(value: string | null): void {
		setErrorMessage('');
		setConfigProvider(value ?? '');
		setSavedModelId('');
		setModels([]);
		setSelectedModel('');
	}

	async function handleFinish(): Promise<void> {
		const provider = providers.find((item) => item.id === configProvider);
		const model = models.find((item) => item.id === selectedModel);
		if (!provider || !model || !canFinish) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAssistantService(provider, model);
			navigate('/home');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the assistant model.'));
		} finally {
			setSavingConfig(false);
		}
	}

	return (
		<main className="relative h-full min-h-0 overflow-y-auto bg-background text-foreground">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
				<div className="absolute -bottom-40 -right-32 h-80 w-80 rounded-full bg-muted blur-3xl" />
			</div>

			<section className="relative mx-auto grid min-h-full w-full max-w-5xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
				<div className="space-y-6">
					<div className="inline-flex h-8 items-center rounded-full border border-border bg-background/80 px-3 text-xs font-medium text-muted-foreground shadow-sm">
						Step {stepNumber} / 2
					</div>

					<div className="space-y-3">
						<h1 className="max-w-sm text-4xl font-semibold tracking-tight sm:text-5xl">
							Set up Friday.
						</h1>
						<p className="max-w-md text-base leading-7 text-muted-foreground">
							Connect one provider, choose one model, and go straight to the assistant.
						</p>
					</div>

					<div className="max-w-md space-y-3" aria-label={`Setup progress: step ${stepNumber} of 2`}>
						<div className="h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full rounded-full bg-primary transition-all ${
									step === 'model' ? 'w-full' : 'w-1/2'
								}`}
							/>
						</div>
						<p className="text-sm text-muted-foreground">
							{step === 'model'
								? `Provider connected. ${selectedModelName || modelCountLabel}.`
								: apiKeySaved
									? `${selectedProviderName} is connected.`
									: `Connect ${selectedProviderName} to continue.`}
						</p>
					</div>
				</div>

				<div className="rounded-xl border border-border bg-background/90 p-4 shadow-xl shadow-foreground/5 backdrop-blur sm:p-5">
					<div className="mb-4 space-y-1.5">
						<p className="text-sm font-medium text-muted-foreground">{setupStatus}</p>
						<h2 className="text-xl font-semibold tracking-tight">{formTitle}</h2>
						<p className="text-sm leading-6 text-muted-foreground">{formDescription}</p>
					</div>

					{step === 'api-key' ? (
						<div className="space-y-3">
							<div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
								<div className="space-y-2">
									<Label htmlFor="provider-select">Provider</Label>
									<Select
										value={selectedProvider}
										onValueChange={(value) => {
											setErrorMessage('');
											setSelectedProvider(value ?? '');
										}}
										disabled={providerOptions.length === 0 || savingApiKey}
									>
										<SelectTrigger id="provider-select" className="h-9 w-full">
											<SelectValue>{selectedProviderName}</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{providerOptions.map((provider, index) => (
												<SelectItem key={`${provider.value}-${index}`} value={provider.value}>
													{provider.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="api-key">API key</Label>
									<Input
										autoComplete="off"
										className="h-9"
										disabled={savingApiKey}
										id="api-key"
										onChange={(event) => {
											setErrorMessage('');
											setApiKeySaved(false);
											setApiKey(event.target.value);
										}}
										onFocus={(event) => {
											if (apiKeySaved) {
												event.currentTarget.select();
											}
										}}
										placeholder="Enter API key"
										spellCheck={false}
										type="password"
										value={apiKey}
									/>
								</div>
							</div>

							<p className="text-sm leading-6 text-muted-foreground">
								{apiKeySaved
									? `${selectedProviderName} access is already saved.`
									: `${selectedProviderName} access is required before model selection.`}
							</p>
						</div>
					) : (
						<div className="space-y-3">
							<div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
								<div className="space-y-2">
									<Label htmlFor="config-provider">Provider</Label>
									<Select
										value={configProvider}
										onValueChange={handleConfigProviderChange}
										disabled={providers.length === 0 || savingConfig}
									>
										<SelectTrigger id="config-provider" className="h-9 w-full">
											<SelectValue>{configProviderName}</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{providers.map((provider) => (
												<SelectItem key={provider.id} value={provider.id}>
													{provider.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="config-model">Model</Label>
									<Select
										value={selectedModel}
										onValueChange={(value) => {
											setErrorMessage('');
											setSelectedModel(value ?? '');
										}}
										disabled={loadingModels || models.length === 0 || savingConfig}
									>
										<SelectTrigger id="config-model" className="h-9 w-full">
											<SelectValue>
												{selectedModelName ||
													(loadingModels ? 'Loading models...' : 'Select a model')}
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
							</div>

							<p className="text-sm leading-6 text-muted-foreground">
								{loadingModels
									? 'Loading models...'
									: models.length === 0
										? 'No models are available for this provider yet.'
										: `${modelCountLabel} for ${configProviderName}.`}
							</p>
						</div>
					)}

					{errorMessage && (
						<div
							className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
							role="alert"
						>
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							<p className="min-w-0 break-words text-sm leading-6">{errorMessage}</p>
						</div>
					)}

					<div className="mt-4 flex flex-col-reverse justify-between gap-2 sm:flex-row">
						{step === 'model' ? (
							<Button
								className="w-full sm:w-auto"
								onClick={() => {
									setErrorMessage('');
									setStep('api-key');
								}}
								type="button"
								variant="outline"
								disabled={savingConfig}
							>
								<ChevronLeft className="size-4" />
								Back
							</Button>
						) : (
							<div className="hidden sm:block" />
						)}

						{step === 'api-key' ? (
							<Button
								className="w-full sm:w-auto"
								disabled={!canContinue}
								onClick={() => {
									void handleContinue();
								}}
								type="button"
							>
								{savingApiKey ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<ArrowRight className="size-4" />
								)}
								{savingApiKey ? 'Saving...' : 'Continue'}
							</Button>
						) : (
							<Button
								className="w-full sm:w-auto"
								onClick={() => {
									void handleFinish();
								}}
								disabled={!canFinish}
								type="button"
							>
								{savingConfig ? (
									<LoaderCircle className="size-4 animate-spin" />
								) : (
									<Bot className="size-4" />
								)}
								{savingConfig ? 'Saving...' : 'Finish setup'}
							</Button>
						)}
					</div>
				</div>
			</section>
		</main>
	);
};

export default StartPage;
