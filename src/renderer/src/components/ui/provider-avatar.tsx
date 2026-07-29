import React from 'react';
import anthropicIconDark from '@resources/providers/anthropic/images/fallback_lobehub/png_dark/anthropic.png';
import anthropicIconLight from '@resources/providers/anthropic/images/fallback_lobehub/png_light/anthropic.png';
import blackForestLabsIconDark from '@resources/providers/black-forest-labs/images/official_downloaded_assets/bfl-symbol-white.png';
import blackForestLabsIconLight from '@resources/providers/black-forest-labs/images/official_downloaded_assets/bfl-symbol-black.png';
import deepgramIcon from '@resources/providers/deepgram/images/fallback_simpleicons/png/deepgram.png';
import deepseekIconDark from '@resources/providers/deepseek/images/fallback_lobehub/png_dark/deepseek-color.png';
import deepseekIconLight from '@resources/providers/deepseek/images/fallback_lobehub/png_light/deepseek-color.png';
import elevenlabsIconDark from '@resources/providers/elevenlabs/images/fallback_lobehub/png_dark/elevenlabs.png';
import elevenlabsIconLight from '@resources/providers/elevenlabs/images/fallback_lobehub/png_light/elevenlabs.png';
import googleIconDark from '@resources/providers/google/images/fallback_lobehub/png_dark/google-color.png';
import googleIconLight from '@resources/providers/google/images/fallback_lobehub/png_light/google-color.png';
import ideogramIconDark from '@resources/providers/ideogram/images/fallback_lobehub/png_dark/ideogram.png';
import ideogramIconLight from '@resources/providers/ideogram/images/fallback_lobehub/png_light/ideogram.png';
import kimiIconDark from '@resources/providers/kimi/images/fallback_lobehub/png_dark/kimi-color.png';
import kimiIconLight from '@resources/providers/kimi/images/fallback_lobehub/png_light/kimi-color.png';
import klingIconDark from '@resources/providers/kling/images/fallback_lobehub/png_dark/kling-color.png';
import klingIconLight from '@resources/providers/kling/images/fallback_lobehub/png_light/kling-color.png';
import lumaIconDark from '@resources/providers/luma/images/fallback_lobehub/png_dark/luma-color.png';
import lumaIconLight from '@resources/providers/luma/images/fallback_lobehub/png_light/luma-color.png';
import midjourneyIconDark from '@resources/providers/midjourney/images/fallback_lobehub/png_dark/midjourney.png';
import midjourneyIconLight from '@resources/providers/midjourney/images/fallback_lobehub/png_light/midjourney.png';
import minimaxIconDark from '@resources/providers/minimax/images/fallback_lobehub/png_dark/minimax-color.png';
import minimaxIconLight from '@resources/providers/minimax/images/fallback_lobehub/png_light/minimax-color.png';
import mistralIconDark from '@resources/providers/mistral/images/fallback_lobehub/png_dark/mistral-color.png';
import mistralIconLight from '@resources/providers/mistral/images/fallback_lobehub/png_light/mistral-color.png';
import openaiIconDark from '@resources/providers/openai/images/fallback_lobehub/png_dark/openai.png';
import openaiIconLight from '@resources/providers/openai/images/fallback_lobehub/png_light/openai.png';
import perplexityIconDark from '@resources/providers/perplexity/images/fallback_lobehub/png_dark/perplexity-color.png';
import perplexityIconLight from '@resources/providers/perplexity/images/fallback_lobehub/png_light/perplexity-color.png';
import qwenIconDark from '@resources/providers/qwen/images/fallback_lobehub/png_dark/qwen-color.png';
import qwenIconLight from '@resources/providers/qwen/images/fallback_lobehub/png_light/qwen-color.png';
import runwayIconDark from '@resources/providers/runway/images/fallback_lobehub/png_dark/runway.png';
import runwayIconLight from '@resources/providers/runway/images/fallback_lobehub/png_light/runway.png';
import stabilityAiIconDark from '@resources/providers/stability-ai/images/fallback_lobehub/png_dark/stability-color.png';
import stabilityAiIconLight from '@resources/providers/stability-ai/images/fallback_lobehub/png_light/stability-color.png';
import sunoIconDark from '@resources/providers/suno/images/fallback_lobehub/png_dark/suno.png';
import sunoIconLight from '@resources/providers/suno/images/fallback_lobehub/png_light/suno.png';
import xaiIconDark from '@resources/providers/xai/images/fallback_lobehub/png_dark/xai.png';
import xaiIconLight from '@resources/providers/xai/images/fallback_lobehub/png_light/xai.png';
import zaiIconDark from '@resources/providers/zai/images/fallback_lobehub/png_dark/zai.png';
import zaiIconLight from '@resources/providers/zai/images/fallback_lobehub/png_light/zai.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type ProviderIconAsset = {
	light: string;
	dark: string;
};

const providerIconAssets: Readonly<Record<string, ProviderIconAsset>> = {
	openai: { light: openaiIconLight, dark: openaiIconDark },
	anthropic: { light: anthropicIconLight, dark: anthropicIconDark },
	google: { light: googleIconLight, dark: googleIconDark },
	meta: { light: metaIconLight, dark: metaIconDark },
	xai: { light: xaiIconLight, dark: xaiIconDark },
	mistral: { light: mistralIconLight, dark: mistralIconDark },
	deepseek: { light: deepseekIconLight, dark: deepseekIconDark },
	qwen: { light: qwenIconLight, dark: qwenIconDark },
	kimi: { light: kimiIconLight, dark: kimiIconDark },
	zai: { light: zaiIconLight, dark: zaiIconDark },
	minimax: { light: minimaxIconLight, dark: minimaxIconDark },
	elevenlabs: { light: elevenlabsIconLight, dark: elevenlabsIconDark },
	deepgram: { light: deepgramIcon, dark: deepgramIcon },
	'black-forest-labs': { light: blackForestLabsIconLight, dark: blackForestLabsIconDark },
	midjourney: { light: midjourneyIconLight, dark: midjourneyIconDark },
	kling: { light: klingIconLight, dark: klingIconDark },
	runway: { light: runwayIconLight, dark: runwayIconDark },
	luma: { light: lumaIconLight, dark: lumaIconDark },
	'stability-ai': { light: stabilityAiIconLight, dark: stabilityAiIconDark },
	ideogram: { light: ideogramIconLight, dark: ideogramIconDark },
	suno: { light: sunoIconLight, dark: sunoIconDark },
	perplexity: { light: perplexityIconLight, dark: perplexityIconDark },
};

function getProviderInitial(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const initials = words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');

	return initials || name.slice(0, 1).toUpperCase();
}

export function ProviderAvatar({
	providerId,
	name,
	className,
}: {
	readonly providerId: string;
	readonly name: string;
	readonly className?: string;
}): React.JSX.Element {
	const icon = providerIconAssets[providerId];
	if (icon) {
		return (
			<Avatar
				className={cn(
					'size-8 rounded-md border border-border bg-background p-1',
					className
				)}
			>
				<AvatarImage
					src={icon.light}
					alt=""
					aria-hidden="true"
					draggable={false}
					className="size-full object-contain dark:hidden"
				/>
				<AvatarImage
					src={icon.dark}
					alt=""
					aria-hidden="true"
					draggable={false}
					className="hidden size-full object-contain dark:block"
				/>
				<AvatarFallback className="rounded-md bg-muted text-sm font-semibold text-muted-foreground">
					{getProviderInitial(name || providerId)}
				</AvatarFallback>
			</Avatar>
		);
	}

	const initial = getProviderInitial(name || providerId);
	return (
		<Avatar
			className={cn(
				'size-8 rounded-md bg-muted text-sm font-semibold text-muted-foreground',
				className
			)}
		>
			<AvatarFallback className="rounded-md bg-muted text-sm font-semibold text-muted-foreground">
				{initial}
			</AvatarFallback>
		</Avatar>
	);
}
