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
		<main className="h-full min-h-0 overflow-y-auto bg-background text-foreground">
			<section className="mx-auto flex min-h-full w-full max-w-2xl items-center px-4 py-6 sm:px-6">
				<Card className="w-full">
					<CardContent className="space-y-6 p-5 sm:p-6">
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">Step {stepNumber} of 2</p>
							<h1 className="text-2xl font-semibold tracking-tight">Friday assistant</h1>
							<p className="text-sm leading-6 text-muted-foreground">
								{formDescription}
							</p>
						</div>

						<div className="space-y-2" aria-label={`Setup progress: step ${stepNumber} of 2`}>
							<div className="grid grid-cols-2 gap-2">
								<div className="h-1.5 rounded-full bg-primary" />
								<div className={`h-1.5 rounded-full ${step === 'model' ? 'bg-primary' : 'bg-muted'}`} />
							</div>
							<p className="text-sm font-medium">{formTitle}</p>
						</div>

						{step === 'api-key' ? (
							<div className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr]">
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
											<SelectTrigger id="provider-select" className="h-10 w-full">
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
											className="h-10"
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
							<div className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-[minmax(0,180px)_1fr]">
									<div className="space-y-2">
										<Label htmlFor="config-provider">Provider</Label>
										<Select
											value={configProvider}
											onValueChange={handleConfigProviderChange}
											disabled={providers.length === 0 || savingConfig}
										>
											<SelectTrigger id="config-provider" className="h-10 w-full">
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
											<SelectTrigger id="config-model" className="h-10 w-full">
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
								className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive"
								role="alert"
							>
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								<p className="min-w-0 break-words text-sm leading-6">{errorMessage}</p>
							</div>
						)}

						<div className="flex flex-col-reverse justify-between gap-2 sm:flex-row">
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
					</CardContent>
				</Card>
			</section>
		</main>
	);
};

export default StartPage;
