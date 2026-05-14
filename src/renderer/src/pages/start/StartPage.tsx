import React, { useEffect, useState } from 'react';
import { Bot, Check, ChevronLeft, KeyRound, Settings2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import type { Model } from '../../../../shared/service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

	const canContinue =
		selectedProvider.length > 0 && (apiKeySaved || apiKey.trim().length > 0) && !savingApiKey;
	const canFinish = configProvider.length > 0 && selectedModel.length > 0 && !savingConfig;
	const selectedProviderName =
		providerOptions.find((provider) => provider.value === selectedProvider)?.label ??
		selectedProvider;
	const configProviderName =
		providers.find((provider) => provider.id === configProvider)?.name ?? configProvider;
	const stepNumber = step === 'api-key' ? 1 : 2;

	useEffect(() => {
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
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
			try {
				const providerModels = await window.app.getModels(provider);
				if (cancelled) return;

				setModels(providerModels);
				const savedModel = providerModels.find((model) => model.id === savedModelId);
				setSelectedModel(savedModel?.id ?? providerModels[0]?.id ?? '');
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
		try {
			if (!apiKeySaved || apiKey !== MASKED_API_KEY) {
				await window.app.setProviderApiKey(selectedProvider, apiKey.trim());
			}

			setStep('model');
		} finally {
			setSavingApiKey(false);
		}
	}

	function handleConfigProviderChange(value: string | null): void {
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
		try {
			await window.app.saveAssistantService(provider, model);
			navigate('/home');
		} finally {
			setSavingConfig(false);
		}
	}

	return (
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-5 py-6 text-foreground">
			<section className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
				<div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-muted/30 p-6">
					<div className="space-y-5">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background">
								<Sparkles className="size-5" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-muted-foreground">Friday</p>
								<h1 className="text-2xl font-semibold tracking-normal">Initial setup</h1>
							</div>
						</div>
						<p className="max-w-md text-sm leading-6 text-muted-foreground">
							Connect a provider and choose the model Friday should use for local assistant
							sessions.
						</p>
					</div>
					<div className="mt-8 space-y-3">
						<div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
							<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
								{step === 'model' ? <Check className="size-4" /> : <KeyRound className="size-4" />}
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium">Provider access</p>
								<p className="text-xs leading-5 text-muted-foreground">
									Save the API key for {selectedProviderName || 'your selected provider'}.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
							<div
								className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
									step === 'model'
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'
								}`}
							>
								<Settings2 className="size-4" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium">Assistant model</p>
								<p className="text-xs leading-5 text-muted-foreground">
									Select the model Friday will use by default.
								</p>
							</div>
						</div>
					</div>
				</div>
				<Card className="min-w-0">
					<CardHeader className="gap-3">
						<div className="flex items-center justify-between gap-3">
							<Badge variant="outline">Step {stepNumber} of 2</Badge>
							<div className="flex w-28 items-center gap-1">
								<div className="h-1.5 flex-1 rounded-full bg-primary" />
								<div
									className={`h-1.5 flex-1 rounded-full ${
										step === 'model' ? 'bg-primary' : 'bg-muted'
									}`}
								/>
							</div>
						</div>
						<div className="space-y-1">
							<CardTitle>{step === 'model' ? 'Choose a model' : 'Connect your provider'}</CardTitle>
							<CardDescription>
								{step === 'model'
									? 'Pick the provider and model used for new assistant runs.'
									: 'Save an API key before choosing the default assistant model.'}
							</CardDescription>
						</div>
					</CardHeader>
					<CardContent>
						{step === 'api-key' ? (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="provider-select">Provider</Label>
									<Select
										value={selectedProvider}
										onValueChange={(value) => {
											setSelectedProvider(value ?? '');
										}}
										disabled={providerOptions.length === 0}
									>
										<SelectTrigger id="provider-select" className="h-10">
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
									<Label htmlFor="api-key">API Key</Label>
									<Input
										autoComplete="off"
										className="h-10"
										id="api-key"
										onChange={(event) => {
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
								<Button
									className="h-9 w-full"
									disabled={!canContinue}
									onClick={() => {
										void handleContinue();
									}}
									type="button"
								>
									{savingApiKey ? 'Saving...' : 'Continue'}
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<Button
									className="h-7 px-0 text-sm"
									onClick={() => {
										setStep('api-key');
									}}
									type="button"
									variant="link"
									disabled={savingConfig}
								>
									<ChevronLeft className="size-4" />
									Back
								</Button>
								<div className="space-y-2">
									<Label htmlFor="config-provider">Provider</Label>
									<Select
										value={configProvider}
										onValueChange={handleConfigProviderChange}
										disabled={providers.length === 0}
									>
										<SelectTrigger id="config-provider" className="h-10">
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
											setSelectedModel(value ?? '');
										}}
										disabled={loadingModels || models.length === 0}
									>
										<SelectTrigger id="config-model" className="h-10">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{models.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<p className="text-xs text-muted-foreground">
										{loadingModels
											? 'Loading models...'
											: models.length === 0
												? 'No models are available for this provider yet.'
												: `${models.length} models available for ${configProviderName}.`}
									</p>
								</div>
								<div>
									<Button
										className="h-9 w-full"
										onClick={() => {
											void handleFinish();
										}}
										disabled={!canFinish}
										type="button"
									>
										<Bot className="size-4" />
										{savingConfig ? 'Saving...' : 'Finish'}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</main>
	);
};

export default StartPage;
