import React from 'react';
import openaiIconDark from '@resources/icons/brands/openai/fallback_lobehub/png_dark/openai.png';
import openaiIconLight from '@resources/icons/brands/openai/fallback_lobehub/png_light/openai.png';
import { cn } from '@/lib/utils';

type DirectConnectorCatalogId = string;

type ConnectorIconAsset = {
	readonly light: string;
	readonly dark: string;
};

const directConnectorIconModules = import.meta.glob<string>(
	'@resources/icons/brands/*/*.png',
	{ eager: true, import: 'default' }
);

const lobehubIconModules = import.meta.glob<string>(
	'@resources/icons/brands/*/fallback_lobehub/png_*/*.png',
	{ eager: true, import: 'default' }
);

function buildIconAssets(): Readonly<Record<string, ConnectorIconAsset>> {
	const partialAssets: Record<string, Partial<ConnectorIconAsset>> = {};

	for (const [path, url] of Object.entries(directConnectorIconModules)) {
		const match = path.match(/brands\/[^/]+\/([^/]+)_(light|dark)(?:_NOT_A_LOGO)?\.png$/);
		if (!match) continue;
		const [, id, theme] = match;
		if (!id || (theme !== 'light' && theme !== 'dark')) continue;
		partialAssets[id] = { ...partialAssets[id], [theme]: url };
	}

	for (const [path, url] of Object.entries(lobehubIconModules)) {
		// Only pick the icon whose filename matches the brand folder name (e.g. brands/xai/.../xai.png)
		const match = path.match(/brands\/([^/]+)\/fallback_lobehub\/png_(light|dark)\/\1\.png$/);
		if (!match) continue;
		const [, id, theme] = match;
		if (!id || (theme !== 'light' && theme !== 'dark')) continue;
		// Direct icons take precedence
		if (!partialAssets[id]?.[theme as keyof ConnectorIconAsset]) {
			partialAssets[id] = { ...partialAssets[id], [theme]: url };
		}
	}

	return Object.freeze(
		Object.fromEntries(
			Object.entries(partialAssets).filter(
				(entry): entry is [string, ConnectorIconAsset] =>
					typeof entry[1].light === 'string' && typeof entry[1].dark === 'string'
			)
		)
	);
}

export const DIRECT_CONNECTOR_ICON_ASSETS = buildIconAssets();

export function ConnectorIcon({
	connectorId,
	directConnectorId,
	name,
	className,
	imageClassName,
	fallbackClassName,
}: {
	readonly connectorId?: string;
	readonly directConnectorId?: DirectConnectorCatalogId;
	readonly name: string;
	readonly className?: string;
	readonly imageClassName?: string;
	readonly fallbackClassName?: string;
}): React.JSX.Element {
	const iconId = directConnectorId ?? connectorId;
	const asset = iconId ? DIRECT_CONNECTOR_ICON_ASSETS[iconId] : undefined;

	return (
		<span
			className={cn(
				'flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background p-0',
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
						className={cn('size-full object-contain', imageClassName)}
					/>
					<img
						src={asset.dark}
						alt=""
						draggable={false}
						className={cn('hidden size-full object-contain dark:block', imageClassName)}
					/>
				</>
			) : (
				<>
					<img
						src={openaiIconLight}
						alt=""
						draggable={false}
						className={cn('size-full object-contain', fallbackClassName)}
					/>
					<img
						src={openaiIconDark}
						alt=""
						draggable={false}
						className={cn('hidden size-full object-contain dark:block', fallbackClassName)}
					/>
				</>
			)}
		</span>
	);
}
