import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, RefreshCw } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderDescription,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Button } from '@/components/ui/Button';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { PROVIDERS } from '../../../../shared/types';
import type {
	AssistantAiSettings,
	ProviderId,
	ProviderModelInfo,
} from '../../../../shared/types';

type ApiKeysByProvider = Partial<Record<ProviderId, string>>;
type ModelsByProvider = Partial<Record<ProviderId, ProviderModelInfo[]>>;

const DEFAULT_PROVIDER = PROVIDERS[0]!;
const DEFAULT_PROVIDER_ID = DEFAULT_PROVIDER.id;

function isProviderId(value: string | undefined): value is ProviderId {
	return PROVIDERS.some((provider) => provider.id === value);
}

function getProviderName(providerId: ProviderId): string {
	return PROVIDERS.find((provider) => provider.id === providerId)?.name ?? providerId;
}

function getStoredApiKeys(settings: AssistantAiSettings): ApiKeysByProvider {
	return Object.fromEntries(
		settings.providers.flatMap((provider) =>
			isProviderId(provider.id) ? [[provider.id, provider.apiKey]] : []
		)
	) as ApiKeysByProvider;
}

export default function SetupPage(): ReactElement {
	const navigate = useNavigate();
	const [selectedProvider, setSelectedProvider] = useState<ProviderId>(DEFAULT_PROVIDER_ID);
	const [selectedModel, setSelectedModel] = useState('');
	const [apiKeys, setApiKeys] = useState<ApiKeysByProvider>({});
	const [modelsByProvider, setModelsByProvider] = useState<ModelsByProvider>({});
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingModels, setIsLoadingModels] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const providerModels = modelsByProvider[selectedProvider] ?? [];
	const apiKey = apiKeys[selectedProvider] ?? '';

	const selectedProviderName = useMemo(
		() => getProviderName(selectedProvider),
		[selectedProvider]
	);

	const loadModels = async (providerId: ProviderId, preferredModel?: string): Promise<void> => {
		setIsLoadingModels(true);
		setMessage(null);

		try {
			const models = await window.app.getModels(providerId);
			setModelsByProvider((current) => ({
				...current,
				[providerId]: models,
			}));

			if (providerId === selectedProvider) {
				const nextModel =
					models.find((model) => model.id === preferredModel)?.id ??
					models.find((model) => model.id === selectedModel)?.id ??
					models[0]?.id ??
					'';
				setSelectedModel(nextModel);
			}
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : `Unable to load ${getProviderName(providerId)} models.`
			);
		} finally {
			setIsLoadingModels(false);
		}
	};

	useEffect(() => {
		let isMounted = true;

		const loadSettings = async (): Promise<void> => {
			try {
				const settings = await window.app.getAssistantAiSettings();
				if (!isMounted) return;

				const providerId = isProviderId(settings.selectedProvider)
					? settings.selectedProvider
					: DEFAULT_PROVIDER_ID;
				const storedApiKeys = getStoredApiKeys(settings);

				setApiKeys(storedApiKeys);
				setSelectedProvider(providerId);
				setSelectedModel(settings.selectedModel ?? '');

				if (storedApiKeys[providerId]) {
					await loadModels(providerId, settings.selectedModel);
				}
			} catch (error) {
				if (!isMounted) return;
				setMessage(
					error instanceof Error ? error.message : 'Unable to load assistant setup.'
				);
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		void loadSettings();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleProviderChange = (providerId: string): void => {
		if (!isProviderId(providerId)) return;

		const cachedModels = modelsByProvider[providerId] ?? [];
		setSelectedProvider(providerId);
		setSelectedModel(cachedModels[0]?.id ?? '');
		setMessage(null);

		if (apiKeys[providerId] && cachedModels.length === 0) {
			void loadModels(providerId);
		}
	};

	const saveKeyAndLoadModels = async (): Promise<void> => {
		const trimmedApiKey = apiKey.trim();
		if (!trimmedApiKey) {
			setMessage(`${selectedProviderName} API key is required before loading models.`);
			return;
		}

		setIsSaving(true);
		setMessage(null);

		try {
			const settings = await window.app.setAssistantAiProviderApiKey(
				selectedProvider,
				trimmedApiKey
			);
			setApiKeys(getStoredApiKeys(settings));
			await loadModels(selectedProvider, selectedModel);
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : `Unable to save ${selectedProviderName} API key.`
			);
		} finally {
			setIsSaving(false);
		}
	};

	const continueToApp = async (): Promise<void> => {
		const trimmedApiKey = apiKey.trim();

		if (!trimmedApiKey) {
			setMessage(`${selectedProviderName} API key is required.`);
			return;
		}

		if (!selectedModel) {
			setMessage('Select a model before continuing.');
			return;
		}

		setIsSaving(true);
		setMessage(null);

		try {
			await window.app.setAssistantAiProviderApiKey(selectedProvider, trimmedApiKey);
			await window.app.setAssistantAiSelection({
				selectedProvider,
				selectedModel,
			});
			void navigate({ to: '/home', replace: true });
		} catch (error) {
			setMessage(
				error instanceof Error ? error.message : 'Unable to save assistant setup.'
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<PageContainer className="h-full">
			<PageHeader>
				<PageHeaderTitle>Setup</PageHeaderTitle>
				<PageHeaderDescription>
					Choose the provider, API key, and model used by the assistant.
				</PageHeaderDescription>
			</PageHeader>
			<PageBody className="items-center justify-center">
				<div className="w-full max-w-xl rounded-lg border bg-card p-6 shadow-sm">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="setup-provider">Provider</FieldLabel>
							<Select
								value={selectedProvider}
								onValueChange={handleProviderChange}
								disabled={isLoading || isSaving}
							>
								<SelectTrigger id="setup-provider">
									<SelectValue placeholder="Select provider" />
								</SelectTrigger>
								<SelectContent>
									{PROVIDERS.map((provider) => (
										<SelectItem key={provider.id} value={provider.id}>
											{provider.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="setup-api-key">API key</FieldLabel>
							<div className="flex gap-2">
								<Input
									id="setup-api-key"
									type="password"
									value={apiKey}
									placeholder={`${selectedProviderName} API key`}
									autoComplete="off"
									spellCheck={false}
									className="font-mono"
									disabled={isLoading || isSaving}
									onChange={(event) => {
										setApiKeys((current) => ({
											...current,
											[selectedProvider]: event.target.value,
										}));
										setMessage(null);
									}}
								/>
								<Button
									type="button"
									variant="outline"
									size="lg"
									disabled={isLoading || isSaving || isLoadingModels}
									onClick={() => void saveKeyAndLoadModels()}
								>
									<RefreshCw className={isLoadingModels ? 'animate-spin' : undefined} />
									Models
								</Button>
							</div>
							<FieldDescription>
								Save the key first to load the provider model list.
							</FieldDescription>
						</Field>

						<Field>
							<FieldLabel htmlFor="setup-model">Model</FieldLabel>
							<Select
								value={selectedModel}
								onValueChange={setSelectedModel}
								disabled={
									isLoading ||
									isSaving ||
									isLoadingModels ||
									providerModels.length === 0
								}
							>
								<SelectTrigger id="setup-model">
									<SelectValue
										placeholder={
											isLoadingModels ? 'Loading models...' : 'Select model'
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{providerModels.map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</Field>

						{message && (
							<Field>
								<FieldDescription className="text-destructive">
									{message}
								</FieldDescription>
							</Field>
						)}

						<div className="flex justify-end">
							<Button
								type="button"
								size="lg"
								disabled={isLoading || isSaving || isLoadingModels}
								onClick={() => void continueToApp()}
							>
								Continue
								<ArrowRight />
							</Button>
						</div>
					</FieldGroup>
				</div>
			</PageBody>
		</PageContainer>
	);
}
