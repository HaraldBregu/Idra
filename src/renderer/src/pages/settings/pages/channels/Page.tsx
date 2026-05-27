import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsSection } from '../../components';
import type { ChannelConnectionStatus, ChannelType } from '../../../../../../shared/channels';
import type { ChannelCatalogEntry } from '../../../../../../shared/channels';
import { ChannelIcon } from './ChannelIcon';

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

			<SettingsSection hideTitle title={t('settings.channels.catalog')}>
				<SettingsPanel>
					{catalog.filter((entry) => entry.catalogVisible).map((entry) => {
						const isRuntimeChannel = entry.runtime === 'bundled';
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
								className="border-b border-border/60 last:border-b-0 hover:bg-muted/50"
							>
								<ChannelIcon
									channelId={entry.id}
									name={entry.label}
									brandIconId={entry.brandIconId}
								/>
								<ItemContent className="min-w-0 flex-col items-start gap-0">
									<ItemTitle className="truncate">{entry.label}</ItemTitle>
									<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground/60">
										{entry.blurb}
									</p>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-1.5">
									<Badge
										variant={isRuntimeChannel ? getConnectionBadgeVariant(status) : 'outline'}
										className="h-5 px-2 text-[10px]"
									>
										{isRuntimeChannel
											? t(`channels.status.${status}`)
											: t('settings.channels.configOnly')}
									</Badge>
									<ChevronRight
										className="size-3.5 text-muted-foreground"
										strokeWidth={1.8}
									/>
								</ItemActions>
							</Item>
						);
					})}
				</SettingsPanel>
			</SettingsSection>

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}
		</SettingsPageShell>
	);
};

export default ChannelsPage;
