import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import discordIcon from '@resources/icons/brands/discord/raw/discord_source.svg';
import telegramIconDark from '@resources/icons/brands/telegram/telegram_dark.png';
import telegramIconLight from '@resources/icons/brands/telegram/telegram_light.png';
import type { ChannelType } from '../../../../../../shared';
import { getChannelBrandIconId } from '../../../../../../shared';

type ChannelIconAsset = {
	readonly light: string;
	readonly dark: string;
};

const CHANNEL_ICON_ASSETS: Readonly<Record<string, ChannelIconAsset>> = {
	telegram: { light: telegramIconLight, dark: telegramIconDark },
};

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
				'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background p-1',
				className
			)}
			aria-hidden="true"
			title={name}
		>
			{iconId === 'discord' ? (
				<img
					src={discordIcon}
					alt=""
					draggable={false}
					className={cn('size-full object-contain', imageClassName)}
				/>
			) : asset ? (
				<>
					<img
						src={asset.light}
						alt=""
						draggable={false}
						className={cn('absolute inset-0 size-full object-contain dark:hidden', imageClassName)}
					/>
					<img
						src={asset.dark}
						alt=""
						draggable={false}
						className={cn('absolute inset-0 hidden size-full object-contain dark:block', imageClassName)}
					/>
				</>
			) : (
				<Bot className={cn('size-3.5 text-muted-foreground', fallbackClassName)} strokeWidth={1.8} />
			)}
		</span>
	);
}
