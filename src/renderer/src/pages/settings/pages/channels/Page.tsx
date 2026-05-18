import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	Bot,
	ChevronRight,
	Hash,
	MessageCircleMore,
	Phone,
	Send,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import type { ChannelType } from '../../../../../../shared/channels';
import type { ChannelCatalogEntry } from '../../../../../../shared/channel-catalog';

const CHANNEL_ICONS: Partial<Record<ChannelType, typeof Send>> = {
	discord: MessageCircleMore,
	slack: Hash,
	telegram: Send,
	whatsapp: Phone,
};

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [catalog, setCatalog] = useState<readonly ChannelCatalogEntry[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		window.channels
			.listCatalog()
			.then((nextCatalog) => {
				if (!mounted) return;
				setCatalog(nextCatalog);
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channel catalog:', error);
				if (mounted) setLoadError(error instanceof Error ? error.message : String(error));
			});

		return () => {
			mounted = false;
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
						const Icon = CHANNEL_ICONS[entry.id] ?? Bot;

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
									<ItemMedia variant="icon" className="size-7">
										<Icon className="size-3.5" strokeWidth={1.8} />
									</ItemMedia>
									<ItemContent className="min-w-0">
										<ItemTitle className="w-full max-w-full truncate">{entry.label}</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end">
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
