import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelType } from '../../../../../../shared/channels';
import { getChannelBrandIconId } from '../../../../../../shared/channels';

type ChannelIconAsset = {
	readonly light: string;
	readonly dark: string;
};

const channelIconModules = import.meta.glob<string>('@resources/icons/brands/*/*.png', {
	eager: true,
	import: 'default',
});

function buildIconAssets(): Readonly<Record<string, ChannelIconAsset>> {
	const partialAssets: Record<string, Partial<ChannelIconAsset>> = {};

	for (const [path, url] of Object.entries(channelIconModules)) {
		const match = path.match(/brands\/[^/]+\/([^/]+)_(light|dark)(?:_NOT_A_LOGO)?\.png$/);
		if (!match) continue;
		const [, id, theme] = match;
		if (!id || (theme !== 'light' && theme !== 'dark')) continue;
		partialAssets[id] = { ...partialAssets[id], [theme]: url };
	}

	return Object.freeze(
		Object.fromEntries(
			Object.entries(partialAssets).filter(
				(entry): entry is [string, ChannelIconAsset] =>
					typeof entry[1].light === 'string' && typeof entry[1].dark === 'string'
			)
		)
	);
}

const CHANNEL_ICON_ASSETS = buildIconAssets();

export function ChannelIcon({
	channelId,
	name,
	brandIconId,
	className,
	imageClassName,
	fallbackClassName,
}: {
	readonly channelId: ChannelType | null | undefined;
	readonly name: string;
	readonly brandIconId?: string;
	readonly className?: string;
	readonly imageClassName?: string;
	readonly fallbackClassName?: string;
}): React.JSX.Element {
	const iconId = brandIconId ?? (channelId ? getChannelBrandIconId(channelId) : undefined);
	const asset = iconId ? CHANNEL_ICON_ASSETS[iconId] : undefined;

	return (
		<span
			className={cn(
				'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background p-1',
				className
			)}
			aria-hidden="true"
			title={name}
		>
			{asset ? (
				<>
					<img
						src={asset.light}
						alt=""
						draggable={false}
						className={cn('size-full object-contain dark:hidden', imageClassName)}
					/>
					<img
						src={asset.dark}
						alt=""
						draggable={false}
						className={cn('hidden size-full object-contain dark:block', imageClassName)}
					/>
				</>
			) : (
				<Bot className={cn('size-3.5 text-muted-foreground', fallbackClassName)} strokeWidth={1.8} />
			)}
		</span>
	);
}
