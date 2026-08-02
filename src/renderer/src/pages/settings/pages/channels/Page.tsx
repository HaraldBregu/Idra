import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { ProviderAvatar } from '@/components/provider-avatar';
import { cn } from '@/lib/utils';
import type { CatalogService } from '@shared/provider_types';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';

const ChannelsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [channels, setChannels] = useState<CatalogService[] | null>(null);
	const [configured, setConfigured] = useState<ReadonlySet<string>>(new Set());
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		void Promise.all([window.app.bots(), window.provider.list()])
			.then(([services, stored]) => {
				if (!mounted) return;
				setChannels(services);
				setConfigured(
					new Set(stored.filter((entry) => entry.apiKey.trim()).map((entry) => entry.id))
				);
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
					{channels.map((service, index) => (
						<Item
							key={service.id}
							as="button"
							type="button"
							onClick={() =>
								navigate(
									`/settings/channels/channelDetail/${encodeURIComponent(service.provider.id)}`
								)
							}
							variant="outline"
							size="md"
							className={cn(
								'grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center border-b border-border/60 text-left hover:bg-muted/50',
								index === channels.length - 1 && 'border-b-0'
							)}
						>
							<ProviderAvatar
								providerId={service.provider.id}
								name={service.provider.name}
								iconDarkUrl={service.provider.iconDarkUrl}
								iconLightUrl={service.provider.iconLightUrl}
							/>
							<ItemContent className="min-w-0">
								<ItemTitle className="w-full max-w-full truncate">
									{service.provider.name}
								</ItemTitle>
								<p className="w-full truncate text-[11px] leading-4 text-muted-foreground">
									{service.name}
								</p>
							</ItemContent>
							<ItemActions className="ml-0 flex-none justify-end gap-1.5">
								<Badge
									variant={configured.has(service.provider.id) ? 'secondary' : 'outline'}
									className="h-5 px-2 text-[10px]"
								>
									{configured.has(service.provider.id)
										? t('settings.channels.configured')
										: t('settings.channels.notConfigured')}
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
