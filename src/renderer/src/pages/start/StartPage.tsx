import React, { useEffect, useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	ChevronLeft,
	Image as ImageIcon,
	Plus,
	LoaderCircle,
	Trash2,
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
import { Separator } from '@/components/ui/separator';
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

type ProviderSetupEntry = {
	id: number;
	providerId: string;
	apiKey: string;
	apiKeySaved: boolean;
};

type SetupStep = 'api-key' | 'model' | 'image-model';

const SETUP_STEPS: readonly SetupStep[] = ['api-key', 'model', 'image-model'];

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
	const [nextProviderEntryId, setNextProviderEntryId] = useState(2);
	const [providerEntries, setProviderEntries] = useState<ProviderSetupEntry[]>(() => [
		{
			id: 1,
			providerId: providerOptions[0]?.value ?? '',
			apiKey: '',
			apiKeySaved: false,
		},
	]);
	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [configProvider, setConfigProvider] = useState('');
	const [savedModelId, setSavedModelId] = useState('');
	const [models, setModels] = useState<Model[]>([]);
	const [selectedModel, setSelectedModel] = useState('');
	const [loadingModels, setLoadingModels] = useState(false);
	const [imageProvider, setImageProvider] = useState('');
	const [savedImageModelId, setSavedImageModelId] = useState('');
	const [imageModels, setImageModels] = useState<Model[]>([]);
	const [selectedImageModel, setSelectedImageModel] = useState('');
	const [loadingImageModels, setLoadingImageModels] = useState(false);
	const [savingApiKey, setSavingApiKey] = useState(false);
	const [savingConfig, setSavingConfig] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const controlHeightClass = 'h-8';
	const stepIndex = SETUP_STEPS.indexOf(step);
	const stepNumber = stepIndex + 1;
	const isModelStep = step === 'model';
	const isImageModelStep = step === 'image-model';

	const canContinue =
		providerEntries.length > 0 &&
		providerEntries.every(
			(entry) => entry.providerId.length > 0 && (entry.apiKeySaved || entry.apiKey.trim().length > 0)
		) &&
		!savingApiKey;
	const canSaveAssistantModel =
		configProvider.length > 0 && selectedModel.length > 0 && !savingConfig;
	const canSaveImageModel =
		imageProvider.length > 0 && selectedImageModel.length > 0 && !savingConfig;
	const getProviderLabel = (providerId: string): string => {
		return providerOptions.find((provider) => provider.value === providerId)?.label ?? providerId;
	};
	const canAddProvider = providerEntries.length < providerOptions.length;
	const configProviderName =
		providers.find((provider) => provider.id === configProvider)?.name ?? configProvider;
	const modelCountLabel = loadingModels
		? 'Loading models...'
		: models.length === 0
			? 'No models available'
			: `${models.length} models available`;
	const selectedModelName =
		models.find((model) => model.id === selectedModel)?.name ?? selectedModel;
	const imageProviderName =
		providers.find((provider) => provider.id === imageProvider)?.name ?? imageProvider;
	const imageModelCountLabel = loadingImageModels
		? 'Loading image models...'
		: imageModels.length === 0
			? 'No image models available'
			: `${imageModels.length} image models available`;
	const selectedImageModelName =
		imageModels.find((model) => model.id === selectedImageModel)?.name ?? selectedImageModel;
	const connectedProviderCount = providerEntries.filter((entry) => entry.apiKeySaved).length;
	const formTitle = isModelStep
		? 'Choose the default model'
		: isImageModelStep
			? 'Choose the image model'
			: 'Connect your providers';
	const formDescription =
		isModelStep
			? 'Pick the model Friday uses when a new assistant run starts, or skip this step.'
			: isImageModelStep
				? 'Pick the model Friday uses for image generation, or skip this step.'
				: 'Save access for the providers Friday should use.';
	const providerSummary = providerEntries.map((entry) => getProviderLabel(entry.providerId)).join(', ');
	const providerSelectionKey = providerEntries.map((entry) => entry.providerId).join(',');
	const setupStatus =
		isModelStep
			? selectedModelName
				? `${configProviderName} - ${selectedModelName}`
				: modelCountLabel
			: isImageModelStep
				? selectedImageModelName
					? `${imageProviderName} - ${selectedImageModelName}`
					: imageModelCountLabel
				: `${providerSummary || 'No providers'} (${connectedProviderCount}/${providerEntries.length} configured)`;

	const getAvailableProviderOptions = (entryId: number): ProviderOption[] => {
		return providerOptions.filter((providerOption) => {
			const isUsedByOther = providerEntries.some(
				(entry) => entry.id !== entryId && entry.providerId === providerOption.value
			);

			return !isUsedByOther;
		});
	};

	useEffect(() => {
		if (step !== 'api-key') return;
		let cancelled = false;

		async function loadApiKeyStatus(): Promise<void> {
			try {
				const storedProviders = await window.app.getProviders();
				if (cancelled) return;

				const selectedProviderIds = providerSelectionKey.split(',').filter(Boolean);
				const savedEntries = await Promise.all(
					selectedProviderIds.map(async (providerId) => {
						const providerImplemented = storedProviders.some((provider) => {
							return (
								provider.id.trim().toLowerCase() === providerId.trim().toLowerCase()
							);
						});
						const saved = providerImplemented
							? await window.app.isProviderApiKeySaved(providerId)
							: false;

						return [providerId, saved] as const;
					})
				);
				if (cancelled) return;

				const savedByProviderId = new Map(savedEntries);
				setProviderEntries((entries) =>
					entries.map((entry) => {
						const saved = savedByProviderId.get(entry.providerId) ?? false;

						return {
							...entry,
							apiKeySaved: saved,
							apiKey: saved ? MASKED_API_KEY : entry.apiKey,
						};
					})
				);
			} catch (error) {
				if (cancelled) return;

				setProviderEntries((entries) =>
					entries.map((entry) => ({ ...entry, apiKeySaved: false, apiKey: '' }))
				);
				setErrorMessage(getErrorMessage(error, 'Could not check saved provider access.'));
			}
		}

		void loadApiKeyStatus();

		return () => {
			cancelled = true;
		};
	}, [providerSelectionKey, step]);

	useEffect(() => {
		if (!isModelStep && !isImageModelStep) return;

		let cancelled = false;

		async function loadProviders(): Promise<void> {
			try {
				const [storedProviders, assistantService, imageGenerationService] = await Promise.all([
					window.app.getProviders(),
					window.app.getAssistantService(),
					window.app.getImageGenerationService(),
				]);
				if (cancelled) return;

				setProviders(storedProviders);
				const preferredProvider =
					storedProviders.find((provider) => provider.id === assistantService?.provider.id) ??
					storedProviders.find((provider) => provider.id === providerEntries[0]?.providerId) ??
					storedProviders[0];
				setConfigProvider(preferredProvider?.id ?? '');
				setSavedModelId(assistantService?.model.id ?? '');
				const preferredImageProvider =
					storedProviders.find(
						(provider) => provider.id === imageGenerationService?.provider.id
					) ??
					storedProviders.find((provider) => provider.id.trim().toLowerCase() === 'openai') ??
					preferredProvider ??
					storedProviders[0];
				setImageProvider(preferredImageProvider?.id ?? '');
				setSavedImageModelId(imageGenerationService?.model.id ?? '');
			} catch (error) {
				if (cancelled) return;

				setProviders([]);
				setConfigProvider('');
				setSavedModelId('');
				setImageProvider('');
				setSavedImageModelId('');
				setErrorMessage(getErrorMessage(error, 'Could not load assistant providers.'));
			}
		}

		void loadProviders();

		return () => {
			cancelled = true;
		};
	}, [isImageModelStep, isModelStep, providerEntries]);

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

	useEffect(() => {
		if (!isImageModelStep) return;

		let cancelled = false;

		async function loadImageModels(): Promise<void> {
			const provider = providers.find((item) => item.id === imageProvider);

			if (!provider) {
				setImageModels([]);
				setSelectedImageModel('');
				return;
			}

			setLoadingImageModels(true);
			setErrorMessage('');
			try {
				const providerModels = await window.app.getImageGenerationModels(provider);
				if (cancelled) return;

				setImageModels(providerModels);
				const savedModel = providerModels.find((model) => model.id === savedImageModelId);
				setSelectedImageModel(savedModel?.id ?? providerModels[0]?.id ?? '');
			} catch (error) {
				if (cancelled) return;

				setImageModels([]);
				setSelectedImageModel('');
				setErrorMessage(getErrorMessage(error, 'Could not load image models for this provider.'));
			} finally {
				if (!cancelled) {
					setLoadingImageModels(false);
				}
			}
		}

		void loadImageModels();

		return () => {
			cancelled = true;
		};
	}, [imageProvider, isImageModelStep, providers, savedImageModelId]);

	async function handleContinue(): Promise<void> {
		if (!canContinue) return;

		setSavingApiKey(true);
		setErrorMessage('');
		try {
			for (const entry of providerEntries) {
				if (!entry.apiKeySaved || entry.apiKey !== MASKED_API_KEY) {
					await window.app.setProviderApiKey(entry.providerId, entry.apiKey.trim());
				}
			}

			setStep('model');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save provider API keys.'));
		} finally {
			setSavingApiKey(false);
		}
	}

	function addProviderEntry(): void {
		const nextProvider = providerOptions.find((provider) => {
			return !providerEntries.some((entry) => entry.providerId === provider.value);
		});

		if (!nextProvider || !canAddProvider) return;

		setProviderEntries((current) => [
			...current,
			{
				id: nextProviderEntryId,
				providerId: nextProvider.value,
				apiKey: '',
				apiKeySaved: false,
			},
		]);
		setNextProviderEntryId((current) => current + 1);
	}

	function removeProviderEntry(entryId: number): void {
		setErrorMessage('');
		setProviderEntries((current) => current.filter((entry) => entry.id !== entryId));
	}

	function handleProviderChange(entryId: number, providerId: string): void {
		setErrorMessage('');
		setProviderEntries((current) =>
			current.map((entry) => {
				if (entry.id !== entryId) return entry;

				return {
					...entry,
					providerId,
					apiKey: '',
					apiKeySaved: false,
				};
			})
		);
	}

	function handleApiKeyChange(entryId: number, apiKey: string): void {
		setErrorMessage('');
		setProviderEntries((current) =>
			current.map((entry) => {
				if (entry.id !== entryId) return entry;

				return {
					...entry,
					apiKey,
					apiKeySaved: false,
				};
			})
		);
	}

	function handleApiKeyFocus(entry: ProviderSetupEntry, event: React.FocusEvent<HTMLInputElement>): void {
		if (entry.apiKeySaved) {
			event.currentTarget.select();
		}
	}

	function handleConfigProviderChange(value: string | null): void {
		setErrorMessage('');
		setConfigProvider(value ?? '');
		setSavedModelId('');
		setModels([]);
		setSelectedModel('');
	}

	function handleImageProviderChange(value: string | null): void {
		setErrorMessage('');
		setImageProvider(value ?? '');
		setSavedImageModelId('');
		setImageModels([]);
		setSelectedImageModel('');
	}

	async function handleSaveAssistantModel(): Promise<void> {
		const provider = providers.find((item) => item.id === configProvider);
		const model = models.find((item) => item.id === selectedModel);
		if (!provider || !model || !canSaveAssistantModel) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveAssistantService(provider, model);
			setStep('image-model');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the assistant model.'));
		} finally {
			setSavingConfig(false);
		}
	}

	function handleSkipAssistantModel(): void {
		setErrorMessage('');
		setStep('image-model');
	}

	async function handleFinishImageModel(): Promise<void> {
		const provider = providers.find((item) => item.id === imageProvider);
		const model = imageModels.find((item) => item.id === selectedImageModel);
		if (!provider || !model || !canSaveImageModel) return;

		setSavingConfig(true);
		setErrorMessage('');
		try {
			await window.app.saveImageGenerationService(provider, model);
			navigate('/home');
		} catch (error) {
			setErrorMessage(getErrorMessage(error, 'Could not save the image generation model.'));
		} finally {
			setSavingConfig(false);
		}
	}

	function handleSkipImageModel(): void {
		setErrorMessage('');
		navigate('/home');
	}

	function handleBack(): void {
		setErrorMessage('');
		setStep(isImageModelStep ? 'model' : 'api-key');
	}

	return (
		<main className="relative h-full min-h-0 overflow-y-auto bg-background text-foreground">
			<section className="relative mx-auto grid min-h-full w-full max-w-5xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr]">
				<div className="space-y-6">
					<div className="inline-flex h-8 items-center rounded-full border border-border bg-background/80 px-3 text-xs font-medium text-muted-foreground shadow-sm">
						Step {stepNumber} / {SETUP_STEPS.length}
					</div>

					<div className="space-y-3">
						<h1 className="max-w-sm text-4xl font-semibold tracking-tight sm:text-5xl">
							Set up Friday.
						</h1>
						<p className="max-w-md text-base leading-7 text-muted-foreground">
							Connect one or more providers, choose optional text and image models, and go
							straight to the assistant.
						</p>
					</div>

					<div
						className="max-w-md space-y-3"
						aria-label={`Setup progress: step ${stepNumber} of ${SETUP_STEPS.length}`}
					>
						<div className="h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${(stepNumber / SETUP_STEPS.length) * 100}%` }}
							/>
						</div>
						<p className="text-sm text-muted-foreground">
							{isModelStep
								? `Provider connected. ${selectedModelName || modelCountLabel}.`
								: isImageModelStep
									? `Assistant model step complete. ${selectedImageModelName || imageModelCountLabel}.`
									: connectedProviderCount === providerEntries.length
										? `${providerSummary} access is ready.`
										: `${connectedProviderCount}/${providerEntries.length} providers configured. Continue to finish setup.`}
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
							{providerEntries.map((entry, index) => {
								const providerName = getProviderLabel(entry.providerId);
								const entryOptions = getAvailableProviderOptions(entry.id);

								return (
									<div key={entry.id} className="space-y-2">
										<div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr_auto]">
											<div className="space-y-2">
												<Label htmlFor={`provider-${entry.id}`}>Provider</Label>
												<Select
													value={entry.providerId}
													onValueChange={(value) => {
														handleProviderChange(entry.id, value ?? '');
													}}
													disabled={providerOptions.length === 0 || savingApiKey}
												>
													<SelectTrigger id={`provider-${entry.id}`} className={`${controlHeightClass} w-full`}>
														<SelectValue>{providerName}</SelectValue>
													</SelectTrigger>
													<SelectContent>
														{entryOptions.map((providerOption) => (
															<SelectItem key={providerOption.value} value={providerOption.value}>
																{providerOption.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>

											<div className="space-y-2">
												<Label htmlFor={`api-key-${entry.id}`}>API key</Label>
												<Input
													autoComplete="off"
													className={controlHeightClass}
													disabled={savingApiKey}
													id={`api-key-${entry.id}`}
													onChange={(event) => {
														handleApiKeyChange(entry.id, event.target.value);
													}}
													onFocus={(event) => {
														handleApiKeyFocus(entry, event);
													}}
													placeholder="Enter API key"
													spellCheck={false}
													type="password"
													value={entry.apiKey}
												/>
											</div>

											<div className="flex items-end">
												{providerEntries.length > 1 ? (
													<Button
														type="button"
														variant="outline"
														size="icon-lg"
														className="shrink-0"
														onClick={() => {
															removeProviderEntry(entry.id);
														}}
														disabled={savingApiKey}
														aria-label="Remove provider"
													>
														<Trash2 className="size-4" />
													</Button>
												) : null}
											</div>
										</div>

										<p className="text-sm leading-6 text-muted-foreground">
											{entry.apiKeySaved
												? `${providerName} access is already saved.`
												: `${providerName} access is required before model selection.`}
										</p>
										{index !== providerEntries.length - 1 && <Separator />}
									</div>
								);
							})}

							<Button
								type="button"
								variant="outline"
								disabled={!canAddProvider || savingApiKey}
								onClick={() => {
									addProviderEntry();
								}}
								className="w-full sm:w-auto"
							>
								<Plus className="size-4" />
								Add provider
							</Button>
						</div>
					) : isModelStep ? (
						<div className="space-y-3">
							<div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
								<div className="space-y-2">
									<Label htmlFor="config-provider">Provider</Label>
									<Select
										value={configProvider}
										onValueChange={handleConfigProviderChange}
										disabled={providers.length === 0 || savingConfig}
									>
										<SelectTrigger id="config-provider" className={`${controlHeightClass} w-full`}>
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
										<SelectTrigger id="config-model" className={`${controlHeightClass} w-full`}>
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
					) : (
						<div className="space-y-3">
							<div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_1fr]">
								<div className="space-y-2">
									<Label htmlFor="image-provider">Provider</Label>
									<Select
										value={imageProvider}
										onValueChange={handleImageProviderChange}
										disabled={providers.length === 0 || savingConfig}
									>
										<SelectTrigger id="image-provider" className={`${controlHeightClass} w-full`}>
											<SelectValue>{imageProviderName}</SelectValue>
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
									<Label htmlFor="image-model">Image model</Label>
									<Select
										value={selectedImageModel}
										onValueChange={(value) => {
											setErrorMessage('');
											setSelectedImageModel(value ?? '');
										}}
										disabled={loadingImageModels || imageModels.length === 0 || savingConfig}
									>
										<SelectTrigger id="image-model" className={`${controlHeightClass} w-full`}>
											<SelectValue>
												{selectedImageModelName ||
													(loadingImageModels ? 'Loading image models...' : 'Select a model')}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{imageModels.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<p className="text-sm leading-6 text-muted-foreground">
								{loadingImageModels
									? 'Loading image models...'
									: imageModels.length === 0
										? 'No image generation models are available for this provider yet.'
										: `${imageModelCountLabel} for ${imageProviderName}.`}
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
						{step !== 'api-key' ? (
							<Button
								className="w-full sm:w-auto"
								onClick={handleBack}
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
						) : isModelStep ? (
							<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
								<Button
									className="w-full sm:w-auto"
									onClick={handleSkipAssistantModel}
									disabled={savingConfig}
									type="button"
									variant="outline"
								>
									Skip
								</Button>
								<Button
									className="w-full sm:w-auto"
									onClick={() => {
										void handleSaveAssistantModel();
									}}
									disabled={!canSaveAssistantModel}
									type="button"
								>
									{savingConfig ? (
										<LoaderCircle className="size-4 animate-spin" />
									) : (
										<ArrowRight className="size-4" />
									)}
									{savingConfig ? 'Saving...' : 'Continue'}
								</Button>
							</div>
						) : (
							<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
								<Button
									className="w-full sm:w-auto"
									onClick={handleSkipImageModel}
									disabled={savingConfig}
									type="button"
									variant="outline"
								>
									Skip
								</Button>
								<Button
									className="w-full sm:w-auto"
									onClick={() => {
										void handleFinishImageModel();
									}}
									disabled={!canSaveImageModel}
									type="button"
								>
									{savingConfig ? (
										<LoaderCircle className="size-4 animate-spin" />
									) : (
										<ImageIcon className="size-4" />
									)}
									{savingConfig ? 'Saving...' : 'Finish setup'}
								</Button>
							</div>
						)}
					</div>
				</div>
			</section>
		</main>
	);
};

export default StartPage;
