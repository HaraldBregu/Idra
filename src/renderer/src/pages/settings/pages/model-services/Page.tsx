import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, FolderOpen, History, LoaderCircle, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AGENTS } from '../../../../../../shared/agents';
import type { Model } from '../../../../../../shared/agents/service';
import type { PublicProvider } from '../../../../../../shared/providers';
import {
	MODEL_SERVICE_DEFINITIONS,
	getProviderCatalogItem,
} from '../../../start/constants';
import type { ModelServiceDefinition, ProviderModelGroup } from '../../../start/types';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { SETTINGS_MODEL_SERVICE_ITEMS } from '../../navigation';

interface ModelServicePageState {
	readonly providers: PublicProvider[];
	readonly modelGroups: ProviderModelGroup[];
	readonly providerId: string;
	readonly modelId: string;
	readonly loading: boolean;
	readonly loadingModels: boolean;
	readonly saving: boolean;
	readonly saved: boolean;
	readonly error: string | null;
}

const initialState: ModelServicePageState = {
	providers: [],
	modelGroups: [],
	providerId: '',
	modelId: '',
	loading: true,
	loadingModels: false,
	saving: false,
	saved: false,
	error: null,
};

function normalizeServiceId(serviceId: string | undefined): string {
	if (serviceId === 'friday' || serviceId === 'main') return AGENTS.assistant;
	return serviceId ?? '';
}

function mergeModels(models: readonly Model[], selectedModel?: Model): Model[] {
	const byId = new Map(models.map((model) => [model.id, model]));
	if (selectedModel && !byId.has(selectedModel.id)) byId.set(selectedModel.id, selectedModel);
	return [...byId.values()];
}

function mergeProviders(
	providers: readonly PublicProvider[],
	selectedProvider?: PublicProvider
): PublicProvider[] {
	const byId = new Map(providers.map((provider) => [provider.id, provider]));
	if (selectedProvider && !byId.has(selectedProvider.id)) byId.set(selectedProvider.id, selectedProvider);
	return [...byId.values()];
}

function firstErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	return fallback;
}

const ModelServicePage: React.FC = () => {
	const { t } = useTranslation();
	const { serviceId: routeServiceId } = useParams();
	const serviceId = normalizeServiceId(routeServiceId);
	const service = MODEL_SERVICE_DEFINITIONS.find(
		(definition): definition is ModelServiceDefinition => definition.id === serviceId
	);
	const navigationItem = SETTINGS_MODEL_SERVICE_ITEMS.find((item) => item.id === serviceId);
	const [state, setState] = useState<ModelServicePageState>(initialState);
	const [historyError, setHistoryError] = useState<string | null>(null);
	const [deletingHistory, setDeletingHistory] = useState(false);

	const selectedGroup = useMemo(
		() => state.modelGroups.find((group) => group.provider.id === state.providerId),
		[state.modelGroups, state.providerId]
	);
	const selectedProvider = selectedGroup?.provider;
	const selectedModel = selectedGroup?.models.find((model) => model.id === state.modelId);
	const ServiceIcon = service?.icon;

	useEffect(() => {
		if (!service) return;
		const activeService = service;
		let mounted = true;

		async function loadService(): Promise<void> {
			setState((current) => ({
				...current,
				loading: true,
				loadingModels: true,
				saved: false,
				error: null,
			}));

			try {
				const [storedProviders, selection] = await Promise.all([
					window.store.getProviders(),
					activeService.getSelection(),
				]);
				if (!mounted) return;

				const providers = mergeProviders(storedProviders, selection?.provider);
				const modelGroups: ProviderModelGroup[] = [];
				let firstModelError: unknown;

				for (const provider of providers) {
					try {
						const models = await activeService.getModels(provider);
						const nextModels =
							selection?.provider.id === provider.id
								? mergeModels(models, selection.model)
								: models;
						if (nextModels.length > 0) modelGroups.push({ provider, models: nextModels });
					} catch (error) {
						firstModelError ??= error;
					}
				}

				if (!mounted) return;
				const preferredGroup =
					modelGroups.find((group) => group.provider.id === selection?.provider.id) ??
					modelGroups[0];
				const preferredModel =
					preferredGroup?.models.find((model) => model.id === selection?.model.id) ??
					preferredGroup?.models[0];

				setState({
					providers,
					modelGroups,
					providerId: preferredGroup?.provider.id ?? '',
					modelId: preferredModel?.id ?? '',
					loading: false,
					loadingModels: false,
					saving: false,
					saved: false,
					error: firstModelError
						? firstErrorMessage(firstModelError, t('settings.modelServices.modelsLoadError'))
						: null,
				});
			} catch (error) {
				if (!mounted) return;
				setState({
					...initialState,
					loading: false,
					loadingModels: false,
					error: firstErrorMessage(error, t('settings.modelServices.loadError')),
				});
			}
		}

		void loadService();
		return () => {
			mounted = false;
		};
	}, [service, t]);

	const handleProviderChange = (nextProviderId: string | null): void => {
		const providerId = nextProviderId ?? '';
		const group = state.modelGroups.find((item) => item.provider.id === providerId);
		setState((current) => ({
			...current,
			providerId,
			modelId: group?.models[0]?.id ?? '',
			saved: false,
			error: null,
		}));
	};

	const handleModelChange = (nextModelId: string | null): void => {
		setState((current) => ({
			...current,
			modelId: nextModelId ?? '',
			saved: false,
			error: null,
		}));
	};

	const handleSave = async (): Promise<void> => {
		if (!service || !selectedProvider || !selectedModel) return;
		setState((current) => ({ ...current, saving: true, saved: false, error: null }));
		try {
			const didSave = await service.saveSelection(selectedProvider, selectedModel);
			if (!didSave) throw new Error(t('settings.modelServices.saveError'));
			setState((current) => ({ ...current, saving: false, saved: true }));
		} catch (error) {
			setState((current) => ({
				...current,
				saving: false,
				error: firstErrorMessage(error, t('settings.modelServices.saveError')),
			}));
		}
	};

	const openHistoryFolder = async (): Promise<void> => {
		setHistoryError(null);
		try {
			await window.agent.openHistoryFolder();
		} catch (error) {
			setHistoryError(firstErrorMessage(error, t('settings.modelServices.loadError')));
		}
	};

	const deleteHistory = async (): Promise<void> => {
		if (!window.confirm(t('settings.chatHistory.confirmDelete'))) return;
		setHistoryError(null);
		setDeletingHistory(true);
		try {
			await window.agent.reset();
		} catch (error) {
			setHistoryError(firstErrorMessage(error, t('settings.chatHistory.errors.delete')));
		} finally {
			setDeletingHistory(false);
		}
	};

	if (!service || !navigationItem) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.modelServices.detailsTitle')} />
				<SettingsPanel>
					<SettingsEmptyState
						icon={AlertTriangle}
						title={t('settings.modelServices.notFoundTitle')}
						description={t('settings.modelServices.notFoundDescription')}
					/>
				</SettingsPanel>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				icon={ServiceIcon}
				title={t(navigationItem.labelKey)}
				description={t(navigationItem.descriptionKey)}
			/>

			{state.error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{state.error}
				</SettingsNotice>
			)}

			<SettingsSection
				title={t('settings.modelServices.configuration')}
				description={t('settings.modelServices.subtitle')}
			>
				<Collapsible defaultOpen className="rounded-lg border border-border/70 bg-card">
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{selectedProvider
									? getProviderCatalogItem(selectedProvider.id).name
									: t('settings.modelServices.providerPlaceholder')}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								{selectedModel?.name ?? selectedModel?.id ?? t('settings.modelServices.modelUnavailable')}
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
					{state.loading ? (
						<SettingsLoadingRows rows={2} />
					) : (
						<div className="grid gap-3 px-3 py-3">
							<div className="grid gap-3 sm:grid-cols-2">
								<SettingsField
									id="model-service-provider"
									label={t('settings.modelServices.provider')}
									description={t('settings.modelServices.providerDescription')}
								>
									<Select
										value={state.providerId}
										onValueChange={handleProviderChange}
										disabled={state.loading || state.saving || state.modelGroups.length === 0}
									>
										<SelectTrigger id="model-service-provider" className="w-full text-xs">
											<SelectValue placeholder={t('settings.modelServices.providerPlaceholder')} />
										</SelectTrigger>
										<SelectContent>
											{state.modelGroups.map((group) => (
												<SelectItem key={group.provider.id} value={group.provider.id}>
													{getProviderCatalogItem(group.provider.id).name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField
									id="model-service-model"
									label={t('settings.modelServices.model')}
									description={t('settings.modelServices.modelDescription')}
								>
									<Select
										value={state.modelId}
										onValueChange={handleModelChange}
										disabled={
											state.loading ||
											state.loadingModels ||
											state.saving ||
											!selectedProvider ||
											!selectedGroup ||
											selectedGroup.models.length === 0
										}
									>
										<SelectTrigger id="model-service-model" className="w-full text-xs">
											<SelectValue
												placeholder={
													state.loadingModels
														? t('settings.modelServices.modelsLoading')
														: t('settings.modelServices.modelPlaceholder')
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{selectedGroup?.models.map((model) => (
												<SelectItem key={model.id} value={model.id}>
													{model.name || model.id}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>
							</div>

							{state.providers.length === 0 && (
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.providers.noProviders')}
								</p>
							)}
							{state.providers.length > 0 && state.modelGroups.length === 0 && (
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.modelServices.noModels')}
								</p>
							)}
							{state.saved && (
								<p className="text-[11px] leading-4 text-muted-foreground">
									{t('settings.modelServices.saved')}
								</p>
							)}

							<div className="flex justify-end">
								<Button
									type="button"
									size="sm"
									disabled={state.saving || !selectedProvider || !selectedModel}
									onClick={() => void handleSave()}
								>
									{state.saving ? (
										<LoaderCircle className="size-3 animate-spin" />
									) : (
										<Save className="size-3" />
									)}
									{state.saving ? t('settings.modelServices.saving') : t('common.save')}
								</Button>
							</div>
						</div>
					)}
					</CollapsibleContent>
				</Collapsible>
			</SettingsSection>

			{service.id === AGENTS.assistant && (
				<SettingsSection
					title={t('settings.chatHistory.title')}
					description={t('settings.chatHistory.description')}
				>
					<Card size="sm" className="gap-0! p-0!">
						<Item variant="outline" size="md">
							<ItemMedia variant="icon">
								<History className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{t('settings.modelServices.history')}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={t('settings.chatHistory.openFolder')}
									title={t('settings.chatHistory.openFolder')}
									onClick={() => void openHistoryFolder()}
								>
									<FolderOpen className="size-3.5" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									disabled={deletingHistory}
									aria-label={t('settings.chatHistory.delete')}
									title={t('settings.chatHistory.delete')}
									onClick={() => void deleteHistory()}
								>
									{deletingHistory ? (
										<LoaderCircle className="size-3.5 animate-spin" />
									) : (
										<Trash2 className="size-3.5 text-destructive" />
									)}
								</Button>
							</ItemActions>
						</Item>
					</Card>
					{historyError && (
						<SettingsNotice variant="destructive" icon={AlertTriangle}>
							{historyError}
						</SettingsNotice>
					)}
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default ModelServicePage;
