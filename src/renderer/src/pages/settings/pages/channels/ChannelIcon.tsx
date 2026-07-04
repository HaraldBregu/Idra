import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import discordIcon from '@resources/icons/brands/discord/raw/discord_source.svg';
import telegramIcon from '@resources/icons/brands/telegram/raw/telegram_source.svg';
import type { ChannelType } from '../../../../../../shared';
import { getChannelBrandIconId } from '../../../../../../shared';

const CHANNEL_SVG_ICONS: Partial<Record<string, string>> = {
	discord: discordIcon,
	telegram: telegramIcon,
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
	const svgIcon = iconId ? CHANNEL_SVG_ICONS[iconId] : undefined;

	return (
		<span
			className={cn(
				'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background p-1',
				className
			)}
			aria-hidden="true"
			title={name}
		>
			{svgIcon ? (
				<img
					src={svgIcon}
					alt=""
					draggable={false}
					className={cn('size-full object-contain', imageClassName)}
				/>
			) : (
				<Bot className={cn('size-3.5 text-muted-foreground', fallbackClassName)} strokeWidth={1.8} />
			)}
		</span>
	);
}
