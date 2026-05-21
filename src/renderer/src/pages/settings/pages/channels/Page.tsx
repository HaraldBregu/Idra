import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CircleOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import type { ChannelConnectionStatus, ChannelType } from '../../../../../../shared/channels';
import type { ChannelCatalogEntry } from '../../../../../../shared/channel-catalog';
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
	const [catalog, setCatalog] = useState<readonly ChannelCatalogEntry[]>([]);
	const [statusByChannel, setStatusByChannel] = useState<
		Partial<Record<ChannelType, ChannelConnectionStatus>>
	>({});
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		Promise.all([window.channels.listCatalog(), window.channels.getStatus()])
			.then(([nextCatalog, telegramStatus]) => {
				if (!mounted) return;
				setCatalog(nextCatalog);
				if (telegramStatus) {
					setStatusByChannel({ [telegramStatus.type]: telegramStatus.status });
				}
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channel catalog:', error);
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

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.channels')}
				description={t('settings.channels.description')}
			/>

			<SettingsSection title={t('settings.channels.catalog')}>
				<Card size="sm" className="gap-0! p-0!">
					{catalog.map((entry, index) => {
						const isRuntimeChannel = RUNTIME_CHANNELS.has(entry.id);
						const status = statusByChannel[entry.id] ?? 'disconnected';

						return (
							<button
								key={entry.id}
								type="button"
								onClick={() =>
									navigate(`/settings/channels/channelDetail/${encodeURIComponent(entry.id)}`)
								}
								className="w-full text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								<Item
									variant="outline"
									size="md"
									className={cn(
										'cursor-pointer border-b border-border/60 hover:bg-muted/50',
										index === catalog.length - 1 && 'border-b-0'
									)}
								>
									<ChannelIcon channelId={entry.id} name={entry.label} />
									<ItemContent className="min-w-0">
										<ItemTitle className="w-full max-w-full truncate">{entry.label}</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end gap-1.5">
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
							</button>
						);
					})}
				</Card>
			</SettingsSection>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
		</SettingsPageShell>
	);
};

export default ChannelsPage;
