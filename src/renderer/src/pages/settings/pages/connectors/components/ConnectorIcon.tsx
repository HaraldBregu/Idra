import React from 'react';
import openaiIconDark from '@resources/icons/brands/openai/fallback_lobehub/png_dark/openai.png';
import openaiIconLight from '@resources/icons/brands/openai/fallback_lobehub/png_light/openai.png';
import { cn } from '@/lib/utils';
import {
	OPENAI_CONNECTOR_CATALOG,
	type DirectConnectorCatalogId,
	type OpenAiConnectorId,
} from '../../../../../../../shared/connector';

type ConnectorIconAsset = {
	readonly light: string;
	readonly dark: string;
};

const directConnectorIconModules = import.meta.glob<string>(
	'@resources/icons/brands/*/*.png',
	{ eager: true, import: 'default' }
);

const directConnectorIdByOpenAiConnectorId = Object.freeze(
	Object.fromEntries(
		OPENAI_CONNECTOR_CATALOG.map((connector) => [
			connector.id,
			connector.directConnectorId,
		])
	)
) as Readonly<Record<OpenAiConnectorId, DirectConnectorCatalogId>>;

function buildIconAssets(): Readonly<Record<string, ConnectorIconAsset>> {
	const partialAssets: Record<string, Partial<ConnectorIconAsset>> = {};

	for (const [path, url] of Object.entries(directConnectorIconModules)) {
		const match = path.match(/brands\/[^/]+\/([^/]+)_(light|dark)(?:_NOT_A_LOGO)?\.png$/);
		if (!match) continue;
		const [, id, theme] = match;
		if (!id || (theme !== 'light' && theme !== 'dark')) continue;
		partialAssets[id] = { ...partialAssets[id], [theme]: url };
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

export function getDirectConnectorIdForOpenAiConnector(
	connectorId: OpenAiConnectorId
): DirectConnectorCatalogId {
	return directConnectorIdByOpenAiConnectorId[connectorId];
}

export function ConnectorIcon({
	connectorId,
	directConnectorId,
	name,
	className,
	imageClassName,
	fallbackClassName,
}: {
	readonly connectorId?: OpenAiConnectorId;
	readonly directConnectorId?: DirectConnectorCatalogId;
	readonly name: string;
	readonly className?: string;
	readonly imageClassName?: string;
	readonly fallbackClassName?: string;
}): React.JSX.Element {
	const iconId = directConnectorId ?? (connectorId ? getDirectConnectorIdForOpenAiConnector(connectorId) : undefined);
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
						className={cn('size-full object-cover', imageClassName)}
					/>
					<img
						src={asset.dark}
						alt=""
						draggable={false}
						className={cn('hidden size-full object-cover dark:block', imageClassName)}
					/>
				</>
			) : (
				<>
					<img
						src={openaiIconLight}
						alt=""
						draggable={false}
						className={cn('size-full object-cover', fallbackClassName)}
					/>
					<img
						src={openaiIconDark}
						alt=""
						draggable={false}
						className={cn('hidden size-full object-cover dark:block', fallbackClassName)}
					/>
				</>
			)}
		</span>
	);
}
