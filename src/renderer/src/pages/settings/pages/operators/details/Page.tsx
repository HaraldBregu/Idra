import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	CircleOff,
	LoaderCircle,
	Save,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../../components';
import {
	ASSISTANT_OPERATOR_ID,
	DEFAULT_MODEL_REASONING_EFFORT,
	getModelReasoningEfforts,
	supportsModelReasoningEffortProvider,
	type ConfiguredModelOperator,
	type Model,
	type ModelReasoningEffort,
} from '../../../../../../../shared/agents/service';
import { type PublicProvider } from '../../../../../../../shared/providers';
import { resolveOperatorConfig } from './configs';
import { effortForModel, getErrorMessage, mergeProviders, storedEffortForComparison } from './utils';

const OperatorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { operatorId } = useParams<{ operatorId: string }>();
	const config = resolveOperatorConfig(decodeURIComponent(operatorId ?? ''));

	const [providers, setProviders] = useState<PublicProvider[]>([]);
	const [currentOperator, setCurrentOperator] = useState<ConfiguredModelOperator | undefined>();
	const [providerId, setProviderId] = useState('');
	const [models, setModels] = useState<Model[]>([]);
	const [modelId, setModelId] = useState('');
	const [effort, setEffort] = useState<ModelReasoningEffort>(DEFAULT_MODEL_REASONING_EFFORT);
	const [loading, setLoading] = useState(true);
	const [loadingModels, setLoadingModels] = useState(false);
	const [saving, setSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [providerCardOpen, setProviderCardOpen] = useState(false);

	// Load providers + current operator on mount
	useEffect(() => {
		let mounted = true;

		if (!config?.isRuntime) {
			setLoading(false);
			setErrorMessage('');
			setSuccessMessage('');
			return () => { mounted = false; };
		}

		setLoading(true);
		setErrorMessage('');
		setSuccessMessage('');

		void Promise.all([window.store.getProviders(), config.getOperator()])
			.then(async ([nextProviders, nextOperator]) => {
				if (!mounted) return;
				const mergedProviders = mergeProviders(nextProviders, nextOperator);
				const capabilityModelsByProvider = new Map<string, Model[]>();
				let availableProviders = mergedProviders;

				if (config.isCapability && config.getCapabilityModels) {
					const providersWithModels: PublicProvider[] = [];
					for (const provider of mergedProviders) {
						const nextModels = await config.getCapabilityModels(provider).catch(() => []);
						if (nextModels.length > 0 || provider.id === nextOperator?.provider.id) {
							providersWithModels.push(provider);
							capabilityModelsByProvider.set(provider.id, nextModels);
						}
					}
					availableProviders = providersWithModels;
				}

				const preferredProvider =
					availableProviders.find((p) => p.id === nextOperator?.provider.id) ??
					availableProviders[0];
				const preferredCapabilityModels = preferredProvider
					? (capabilityModelsByProvider.get(preferredProvider.id) ?? [])
					: [];
				const preferredCapabilityModelId =
					nextOperator &&
					preferredProvider?.id === nextOperator.provider.id &&
					preferredCapabilityModels.some((m) => m.id === nextOperator.model.id)
						? nextOperator.model.id
						: (preferredCapabilityModels[0]?.id ?? '');

				setProviders(availableProviders);
				setCurrentOperator(nextOperator);
				setProviderId(preferredProvider?.id ?? '');
				setModelId(
					nextOperator && preferredProvider?.id === nextOperator.provider.id
						? config.isCapability
							? preferredCapabilityModelId
							: nextOperator.model.id
						: config.isCapability
							? preferredCapabilityModelId
							: ''
				);
				setEffort(
					nextOperator &&
						preferredProvider?.id === nextOperator.provider.id &&
						config.isAssistant
						? effortForModel(
								nextOperator.model.id,
								nextOperator.model.effort,
								preferredProvider.id
							)
						: DEFAULT_MODEL_REASONING_EFFORT
				);
			})
			.catch((error) => {
				if (!mounted) return;
				setProviders([]);
				setCurrentOperator(undefined);
				setProviderId('');
				setModelId('');
				setEffort(DEFAULT_MODEL_REASONING_EFFORT);
				setErrorMessage(getErrorMessage(error, t('settings.operators.loadError')));
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => { mounted = false; };
	// config is a stable module-level object reference; t is stable from useTranslation
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config, t]);

	const selectedProvider = providers.find((p) => p.id === providerId);

	// Reload models when provider changes
	useEffect(() => {
		let mounted = true;

		if (!selectedProvider || !config) {
			setModels([]);
			setModelId('');
			return () => { mounted = false; };
		}

		setLoadingModels(true);
		setErrorMessage('');

		const loadModels =
			config.isCapability && config.getCapabilityModels
				? config.getCapabilityModels(selectedProvider)
				: window.app.getModels(selectedProvider);

		void loadModels
			.then((nextModels) => {
				if (!mounted) return;
				setModels(nextModels);
				setModelId((current) => {
					if (current && nextModels.some((m) => m.id === current)) return current;
					if (
						currentOperator?.provider.id === selectedProvider.id &&
						nextModels.some((m) => m.id === currentOperator.model.id)
					) {
						return currentOperator.model.id;
					}
					return nextModels[0]?.id ?? '';
				});
			})
			.catch((error) => {
				if (!mounted) return;
				setModels([]);
				setModelId('');
				setErrorMessage(getErrorMessage(error, t('settings.operators.modelsLoadError')));
			})
			.finally(() => {
				if (mounted) setLoadingModels(false);
			});

		return () => { mounted = false; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config, currentOperator, selectedProvider, t]);

	const modelOptions = useMemo(() => {
		const byId = new Map(models.map((m) => [m.id, m]));
		if (
			currentOperator?.provider.id === providerId &&
			currentOperator.model.id &&
			!byId.has(currentOperator.model.id)
		) {
			byId.set(currentOperator.model.id, currentOperator.model);
		}
		return [...byId.values()];
	}, [currentOperator, models, providerId]);

	const selectedModel = modelOptions.find((m) => m.id === modelId);
	const showEffort = Boolean(config?.isAssistant && supportsModelReasoningEffortProvider(providerId));
	const effortOptions = useMemo(
		() => (showEffort ? getModelReasoningEfforts(modelId, providerId) : []),
		[modelId, providerId, showEffort]
	);
	const selectedEffort = showEffort ? effort : undefined;
	const currentEffort =
		config?.isAssistant &&
		currentOperator &&
		supportsModelReasoningEffortProvider(currentOperator.provider.id)
			? storedEffortForComparison(currentOperator.model, currentOperator.provider.id)
			: undefined;
	const hasChanges = config?.isCapability
		? !currentOperator ||
			currentOperator.provider.id !== providerId ||
			currentOperator.model.id !== modelId
		: !currentOperator ||
			currentOperator.provider.id !== providerId ||
			currentOperator.model.id !== modelId ||
			currentEffort !== selectedEffort;
	const canSave = Boolean(selectedProvider && selectedModel && hasChanges && !loadingModels && !saving);

	const handleProviderChange = useCallback((nextValue: string | null): void => {
		setProviderId(nextValue ?? '');
		setModelId('');
		setEffort(DEFAULT_MODEL_REASONING_EFFORT);
		setSuccessMessage('');
	}, []);

	const handleModelChange = useCallback(
		(nextValue: string | null): void => {
			const nextModelId = nextValue ?? '';
			setModelId(nextModelId);
			setEffort((current) => effortForModel(nextModelId, current, providerId));
			setSuccessMessage('');
		},
		[providerId]
	);

	const handleEffortChange = useCallback(
		(nextValue: string | null): void => {
			setEffort(effortForModel(modelId, nextValue, providerId));
			setSuccessMessage('');
		},
		[modelId, providerId]
	);

	useEffect(() => {
		if (!showEffort) return;
		setEffort((current) => effortForModel(modelId, current, providerId));
	}, [modelId, providerId, showEffort]);

	const handleSave = useCallback(async (): Promise<void> => {
		if (!config || !selectedProvider || !selectedModel || !canSave) return;

		setSaving(true);
		setErrorMessage('');
		setSuccessMessage('');
		try {
			const modelToSave: Model =
				config.isAssistant && supportsModelReasoningEffortProvider(selectedProvider.id)
					? { ...selectedModel, effort: effortForModel(selectedModel.id, effort, selectedProvider.id) }
					: { id: selectedModel.id, name: selectedModel.name };

			const saved = await config.saveOperator(selectedProvider, modelToSave);
			if (!saved) throw new Error(t('settings.operators.saveError'));

			setCurrentOperator({
				...config.operatorDef,
				provider: selectedProvider,
				model: modelToSave,
			} as ConfiguredModelOperator);
			setSuccessMessage(t('settings.operators.saved'));
		} catch (error) {
			setErrorMessage(getErrorMessage(error, t('settings.operators.saveError')));
		} finally {
			setSaving(false);
		}
	}, [canSave, config, effort, selectedModel, selectedProvider, t]);

	const openChatHistory = useCallback(() => {
		navigate(`/settings/operators/${ASSISTANT_OPERATOR_ID}/details/chathistory`);
	}, [navigate]);

	if (!config) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.operators.detailsTitle')} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={CircleOff}
						title={t('settings.operators.notFoundTitle')}
						description={t('settings.operators.notFoundDescription')}
						className="min-h-28"
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader
					title={t('settings.operators.detailsTitle')}
					description={t('settings.operators.description')}
				/>
				<SettingsPanel>
					<SettingsLoadingRows rows={3} />
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	const providerCardSummary = selectedProvider
		? selectedModel
			? `${selectedProvider.name} / ${selectedModel.name || selectedModel.id}`
			: selectedProvider.name
		: t('settings.operators.providerPlaceholder');

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t(config.nameKey)}
				description={t(config.descriptionKey)}
			/>

			{errorMessage && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{errorMessage}
				</SettingsNotice>
			)}

			{successMessage && <SettingsNotice icon={CheckCircle2}>{successMessage}</SettingsNotice>}

			{config.isAssistant && (
				<SettingsSection hideTitle title={t('settings.operators.history')}>
					<SettingsPanel>
						<Item
							as="button"
							type="button"
							size="md"
							className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
							onClick={openChatHistory}
						>
							<ItemContent className="min-w-0 flex-1">
								<ItemTitle>{t('settings.chatHistory.title')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
							</ItemActions>
						</Item>
					</SettingsPanel>
				</SettingsSection>
			)}

			{!config.isRuntime ? (
				<SettingsSection
					hideTitle={!config.isAssistant}
					title={t('settings.operators.configuration')}
					description={t(config.configDescKey)}
				>
					<SettingsPanel>
						<div className="grid gap-3 p-3">
							<SettingsNotice icon={CircleOff}>
								{t('settings.operators.configurationPending')}
							</SettingsNotice>

							<SettingsField
								id="operator-provider"
								label={t('settings.operators.provider')}
								description={t(config.providerDescKey)}
							>
								<Select value={config.readOnly?.providerValue ?? ''} disabled>
									<SelectTrigger id="operator-provider" className="w-full text-xs sm:w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{config.readOnly && (
											<SelectItem value={config.readOnly.providerValue}>
												{config.readOnly.providerName}
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</SettingsField>

							<SettingsField
								id="operator-model"
								label={t(config.modelLabelKey)}
								description={t(config.modelDescKey)}
							>
								<Select
									value={config.readOnly?.model?.id ?? 'not-available'}
									disabled
								>
									<SelectTrigger id="operator-model" className="w-full text-xs sm:w-72">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={config.readOnly?.model?.id ?? 'not-available'}>
											{config.readOnly?.model?.name ?? t('settings.operators.modelUnavailable')}
										</SelectItem>
									</SelectContent>
								</Select>
							</SettingsField>
						</div>
					</SettingsPanel>
				</SettingsSection>
			) : (
				<SettingsSection
					hideTitle={!config.isAssistant}
					title={t('settings.operators.configuration')}
					description={t(config.configDescKey)}
				>
					<SettingsPanel>
						<Item
							as="button"
							type="button"
							aria-expanded={providerCardOpen}
							aria-controls="operator-provider-card-content"
							size="md"
							className={`text-left hover:bg-muted/30 ${
								providerCardOpen ? 'border-b border-border/60' : ''
							}`}
							onClick={() => setProviderCardOpen((open) => !open)}
						>
							<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
								<ItemTitle>{t('settings.operators.provider')}</ItemTitle>
								<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground/60">
									{providerCardSummary}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ChevronDown
									className={`size-3 text-muted-foreground transition-transform ${
										providerCardOpen ? 'rotate-180' : ''
									}`}
									strokeWidth={1.8}
								/>
							</ItemActions>
						</Item>

						{providerCardOpen && (
							<div id="operator-provider-card-content" className="grid gap-3 p-3">
								{config.providerMissingKey && providers.length === 0 && (
									<SettingsNotice icon={AlertTriangle}>
										{t(config.providerMissingKey)}
									</SettingsNotice>
								)}

								<SettingsField
									id="operator-provider"
									label={t('settings.operators.provider')}
									description={t(config.providerDescKey)}
								>
									<Select
										value={providerId}
										onValueChange={handleProviderChange}
										disabled={providers.length === 0 || saving}
									>
										<SelectTrigger id="operator-provider" className="w-full text-xs sm:w-72">
											<SelectValue placeholder={t('settings.operators.providerPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{providers.map((provider) => (
												<SelectItem key={provider.id} value={provider.id}>
													{provider.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField
									id="operator-model"
									label={t(config.modelLabelKey)}
									description={t(config.modelDescKey)}
								>
									<Select
										value={modelId}
										onValueChange={handleModelChange}
										disabled={
											!selectedProvider || loadingModels || modelOptions.length === 0 || saving
										}
									>
										<SelectTrigger id="operator-model" className="w-full text-xs sm:w-72">
											<SelectValue
												placeholder={
													loadingModels
														? t('settings.operators.modelsLoading')
														: t('settings.operators.modelPlaceholder')
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{modelOptions.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name || model.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{selectedProvider && !loadingModels && modelOptions.length === 0 && (
										<p className="text-[11px] leading-4 text-muted-foreground/60">
											{t('settings.operators.noModels')}
										</p>
									)}
								</SettingsField>

								{showEffort && (
									<SettingsField
										id="operator-effort"
										label={t('settings.operators.effort')}
										description={t('settings.operators.effortDescription')}
									>
										<Select
											value={effort}
											onValueChange={handleEffortChange}
											disabled={!selectedProvider || !selectedModel || saving}
										>
											<SelectTrigger id="operator-effort" className="w-full text-xs sm:w-72">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{effortOptions.map((value) => (
													<SelectItem key={value} value={value}>
														{t(`settings.operators.effortOptions.${value}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</SettingsField>
								)}

								<div className="flex justify-end">
									<Button
										type="button"
										size="sm"
										disabled={!canSave}
										onClick={() => void handleSave()}
									>
										{saving ? (
											<LoaderCircle className="size-3.5 animate-spin" />
										) : (
											<Save className="size-3.5" />
										)}
										{saving ? t('settings.operators.saving') : t('common.save')}
									</Button>
								</div>
							</div>
						)}
					</SettingsPanel>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default OperatorDetailsPage;
