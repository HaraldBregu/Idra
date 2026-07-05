import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, CircleOff, LoaderCircle, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
	SettingsField,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { CHANNEL_CATALOG, type ChannelConnectionStatus, type ChannelType } from '../../../../../../shared';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../../../../shared/provider_models_definitions';
import { getProviderCatalogItem } from '../../../start/constants';
import { ChannelIcon } from './ChannelIcon';

const RUNTIME_CHANNELS = new Set<ChannelType>(['telegram']);

interface ProviderGroup {
	readonly id: string;
	readonly models: readonly { readonly id: string; readonly name: string }[];
}

const PROVIDER_GROUPS: readonly ProviderGroup[] = LLM_PROVIDERS.map((id) => ({
	id,
	models: LLM_MODELS_BY_PROVIDER[id] ?? [],
})).filter((group) => group.models.length > 0);

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
				setProviderId(storedProviderId);
				setModelId(storedModelId);
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channel settings:', error);
				if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
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

	const saveModelSelection = (nextProviderId: string, nextModelId: string): void => {
		setProviderId(nextProviderId);
		setModelId(nextModelId);
		setLoadError(null);
		Promise.all([
			window.channels.setProviderId(nextProviderId),
			nextModelId ? window.channels.setModelId(nextModelId) : Promise.resolve(),
		]).catch((error) => {
			setLoadError(error instanceof Error ? error.message : String(error));
		});
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.channels')}
				description={t('settings.channels.description')}
			/>

			<SettingsSection title={t('settings.modelServices.configuration')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Sparkles className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-col items-start gap-0.5">
							<ItemTitle>{t('settings.modelServices.provider')}</ItemTitle>
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.modelServices.providerDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto w-full flex-none justify-end sm:w-56">
							<Select
								value={providerId}
								onValueChange={(value) => {
									if (!value) return;
									saveModelSelection(value, modelsFor(value)[0]?.id ?? '');
								}}
							>
								<SelectTrigger id="channels-provider" className="w-full text-xs">
									<SelectValue placeholder={t('settings.modelServices.providerPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{LLM_PROVIDERS.map((id) => (
										<SelectItem key={id} value={id}>
											{getProviderCatalogItem(id).name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>

					<Item variant="outline" size="md">
						<ItemMedia variant="icon">
							<Cpu className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-col items-start gap-0.5">
							<ItemTitle>{t('settings.modelServices.model')}</ItemTitle>
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.modelServices.modelDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto w-full flex-none justify-end sm:w-56">
							<Select
								value={modelId}
								onValueChange={(value) => {
									if (!value) return;
									saveModelSelection(providerId, value);
								}}
								disabled={modelsFor(providerId).length === 0}
							>
								<SelectTrigger id="channels-model" className="w-full text-xs">
									<SelectValue placeholder={t('settings.modelServices.modelPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{modelsFor(providerId).map((model) => (
										<SelectItem key={model.id} value={model.id}>
											{model.name || model.id}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
				</Card>
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
