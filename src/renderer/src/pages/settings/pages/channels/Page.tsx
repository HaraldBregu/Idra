import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';
import { ChannelIcon } from './ChannelIcon';
import { channelList, type ChannelListEntry } from './list';

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [channels, setChannels] = useState<ChannelListEntry[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		window.app
			.getChannels()
			.then((config) => {
				if (mounted) setChannels(channelList(config));
			})
			.catch((error) => {
				console.error('[ChannelsPage] Failed to load channels:', error);
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

			{loadError && <SettingsNotice variant="destructive">{loadError}</SettingsNotice>}

			{!channels ? (
				<SettingsLoadingRows rows={2} />
			) : (
				<Card size="sm" className="gap-0! p-0!">
					{channels.map((channel, index) => (
						<Item
							key={channel.id}
							as="button"
							type="button"
							onClick={() =>
								navigate(`/settings/channels/channelDetail/${encodeURIComponent(channel.id)}`)
							}
							variant="outline"
							size="md"
							className={cn(
								'grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center border-b border-border/60 text-left hover:bg-muted/50',
								index === channels.length - 1 && 'border-b-0'
							)}
						>
							<ChannelIcon
								channelId={channel.id}
								name={channel.label}
								brandIconId={channel.brandIconId}
							/>
							<ItemContent className="min-w-0">
								<ItemTitle className="w-full max-w-full truncate">{channel.label}</ItemTitle>
							</ItemContent>
							<ItemActions className="ml-0 flex-none justify-end gap-1.5">
								<Badge
									variant={channel.enabled ? 'secondary' : 'outline'}
									className="h-5 px-2 text-[10px]"
								>
									{channel.enabled
										? t('settings.channels.enabled')
										: t('settings.channels.disabled')}
								</Badge>
								<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
							</ItemActions>
						</Item>
					))}
				</Card>
			)}
		</SettingsPageShell>
	);
};

export default ChannelsPage;
