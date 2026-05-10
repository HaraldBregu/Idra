import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	DEFAULT_PROVIDERS,
	type Provider,
	type PublicProvider,
} from '../../../../shared/providers';
import type { Model } from '../../../../shared/service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';

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
			const storedProviders = await window.app.getProviders();
			if (cancelled) return;

			setProviders(storedProviders);
			const preferredProvider =
				storedProviders.find((provider) => provider.id === selectedProvider) ?? storedProviders[0];
			setConfigProvider(preferredProvider?.id ?? '');
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
				setSelectedModel(providerModels[0]?.id ?? '');
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
	}, [configProvider, providers, step]);

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
		<main className="flex h-full min-h-0 items-center justify-center bg-background px-6">
			<section className="w-full max-w-2xl space-y-4 text-center">
				<p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friday</p>
				<h1 className="text-4xl font-semibold tracking-normal text-foreground">Start</h1>
				<p className="text-base text-muted-foreground">
					{step === 'model'
						? 'Configure the assistant service with a provider and model.'
						: 'Set up your workspace to begin.'}
				</p>
				<div className="mx-auto flex w-full max-w-sm items-center gap-2 text-left">
					<div className="h-1 flex-1 rounded-full bg-primary" />
					<div
						className={`h-1 flex-1 rounded-full ${step === 'model' ? 'bg-primary' : 'bg-muted'}`}
					/>
				</div>
				{step === 'api-key' ? (
					<div className="mx-auto w-full max-w-sm space-y-4 text-left">
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground" htmlFor="provider-select">
								Provider
							</label>
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
							<label className="text-sm font-medium text-foreground" htmlFor="api-key">
								API Key
							</label>
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
							className="h-10 w-full"
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
					<div className="mx-auto w-full max-w-sm space-y-4 text-left">
						<Button
							className="h-auto px-0 text-sm"
							onClick={() => {
								setStep('api-key');
							}}
							type="button"
							variant="link"
							disabled={savingConfig}
						>
							Back
						</Button>
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground" htmlFor="config-provider">
								Provider
							</label>
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
							<label className="text-sm font-medium text-foreground" htmlFor="config-model">
								Model
							</label>
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
						</div>
						<div>
							<Button
								className="h-10 w-full"
								onClick={() => {
									void handleFinish();
								}}
								disabled={!canFinish}
								type="button"
							>
								{savingConfig ? 'Saving...' : 'Finish'}
							</Button>
						</div>
					</div>
				)}
			</section>
		</main>
	);
};

export default StartPage;
