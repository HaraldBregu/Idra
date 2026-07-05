import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	firstModelIdForProvider,
	LLM_PROVIDER_GROUPS,
	ModelProviderSelect,
	resolveStoredModelProvider,
} from '@/components/model-provider-select';
import { cn } from '@/lib/utils';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { CHANNEL_CATALOG, type ChannelConnectionStatus, type ChannelType } from '../../../../../../shared';
import { ChannelIcon } from './ChannelIcon';

const RUNTIME_CHANNELS = new Set<ChannelType>(['telegram']);

function getConnectionBadgeVariant(
	status: ChannelConnectionStatus
): 'secondary' | 'destructive' | 'outline' {
	if (status === 'connected') return 'secondary';
	if (status === 'error') return 'destructive';
	return 'outline';
}

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [statusByChannel, setStatusByChannel] = useState<
		Partial<Record<ChannelType, ChannelConnectionStatus>>
	>({});
	const [providerId, setProviderId] = useState('');
	const [modelId, setModelId] = useState('');
	const [loadingRuntime, setLoadingRuntime] = useState(true);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [runtimeError, setRuntimeError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		Promise.all([
			window.channels.getStatus(),
			window.channels.getProviderId(),
			window.channels.getModelId(),
		])
			.then(([telegramStatus, storedProviderId, storedModelId]) => {
				if (!mounted) return;
				if (telegramStatus) {
					setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
				}
				const resolved = resolveStoredModelProvider(
					LLM_PROVIDER_GROUPS,
					storedProviderId,
					storedModelId
				);
				setProviderId(resolved.providerId);
				setModelId(resolved.modelId);
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channel settings:', error);
				if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
			})
			.finally(() => {
				if (mounted) setLoadingRuntime(false);
			});

		const unsubscribe = window.channels.onStatusChanged((event) => {
			setStatusByChannel((current) => ({ ...current, [event.type]: event.status }));
			if (event.error) setLoadError(event.error);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	const handleProviderChange = (nextProviderId: string): void => {
		setProviderId(nextProviderId);
		setModelId(firstModelIdForProvider(LLM_PROVIDER_GROUPS, nextProviderId));
		setSaved(false);
		setRuntimeError(null);
	};

	const handleModelChange = (nextModelId: string): void => {
		setModelId(nextModelId);
		setSaved(false);
		setRuntimeError(null);
	};

	const handleSave = async (): Promise<void> => {
		if (!providerId || !modelId) return;
		setSaving(true);
		setSaved(false);
		setRuntimeError(null);
		try {
			await window.channels.setProviderId(providerId);
			await window.channels.setModelId(modelId);
			setSaved(true);
		} catch (error) {
			setRuntimeError(error instanceof Error ? error.message : String(error));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.channels')}
				description={t('settings.channels.description')}
			/>

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<Collapsible className="rounded-lg border border-border/70 bg-card">
					<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-medium leading-4 text-foreground">
								{selectedGroup
									? getProviderCatalogItem(selectedGroup.id).name
									: t('settings.modelServices.providerPlaceholder')}
							</div>
							<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
								{selectedModel?.name ?? selectedModel?.id ?? t('settings.modelServices.modelPlaceholder')}
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
					</CollapsibleTrigger>
					<CollapsibleContent className="border-t border-border/60">
						{loadingRuntime ? (
							<SettingsLoadingRows rows={1} />
						) : (
							<div className="grid gap-3 px-3 py-3">
								<div className="grid gap-3 sm:grid-cols-2">
									<SettingsField
										id="channels-provider"
										label={t('settings.modelServices.provider')}
									>
										<Select value={providerId} onValueChange={handleProviderChange} disabled={saving}>
											<SelectTrigger id="channels-provider" className="w-full text-xs">
												<SelectValue placeholder={t('settings.modelServices.providerPlaceholder')} />
											</SelectTrigger>
											<SelectContent>
												{PROVIDER_GROUPS.map((group) => (
													<SelectItem key={group.id} value={group.id}>
														{getProviderCatalogItem(group.id).name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</SettingsField>

									<SettingsField id="channels-model" label={t('settings.modelServices.model')}>
										<Select
											value={modelId}
											onValueChange={handleModelChange}
											disabled={saving || !selectedGroup || selectedGroup.models.length === 0}
										>
											<SelectTrigger id="channels-model" className="w-full text-xs">
												<SelectValue placeholder={t('settings.modelServices.modelPlaceholder')} />
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

								{runtimeError && (
									<p className="text-[11px] leading-4 text-destructive">{runtimeError}</p>
								)}
								{saved && (
									<p className="text-[11px] leading-4 text-muted-foreground">
										{t('settings.modelServices.saved')}
									</p>
								)}

								<div className="flex justify-end">
									<Button
										type="button"
										size="sm"
										disabled={saving || !providerId || !modelId}
										onClick={() => void handleSave()}
									>
										{saving ? (
											<LoaderCircle className="size-3 animate-spin" />
										) : (
											<Save className="size-3" />
										)}
										{saving ? t('settings.modelServices.saving') : t('common.save')}
									</Button>
								</div>
							</div>
						)}
					</CollapsibleContent>
				</Collapsible>
			</SettingsSection>

			<SettingsSection title={t('settings.channels.catalog')}>
				<Card size="sm" className="gap-0! p-0!">
					{CHANNEL_CATALOG.map((entry, index) => {
						const isRuntimeChannel = RUNTIME_CHANNELS.has(entry.id);
						const status = statusByChannel[entry.id] ?? 'disconnected';

						return (
							<Item
								key={entry.id}
								as="button"
								type="button"
								onClick={() =>
									navigate(`/settings/channels/channelDetail/${encodeURIComponent(entry.id)}`)
								}
								variant="outline"
								size="md"
								className={cn(
									'grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center cursor-pointer border-b border-border/60 text-left hover:bg-muted/50',
									index === CHANNEL_CATALOG.length - 1 && 'border-b-0'
								)}
							>
								<ChannelIcon
									channelId={entry.id}
									name={entry.label}
									brandIconId={entry.brandIconId}
								/>
								<ItemContent className="min-w-0">
									<ItemTitle className="w-full max-w-full truncate">{entry.label}</ItemTitle>
								</ItemContent>
								<ItemActions className="ml-0 flex-none justify-end gap-1.5">
									{isRuntimeChannel ? (
										<Badge
											variant={getConnectionBadgeVariant(status)}
											className="h-5 px-2 text-[10px]"
										>
											{t(`channels.status.${status}`)}
										</Badge>
									) : (
										<Badge variant="outline" className="h-5 px-2 text-[10px]">
											{t('settings.channels.configOnly')}
										</Badge>
									)}
									{!isRuntimeChannel && (
										<CircleOff className="size-3.5 text-muted-foreground" />
									)}
									<ChevronRight
										className="size-3.5 text-muted-foreground"
										strokeWidth={1.8}
									/>
								</ItemActions>
							</Item>
						);
					})}
				</Card>
			</SettingsSection>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
		</SettingsPageShell>
	);
};

export default ChannelsPage;
