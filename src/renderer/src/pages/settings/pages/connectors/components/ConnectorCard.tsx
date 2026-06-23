import React from 'react';
import { ChevronRight, PlugZap } from 'lucide-react';
import openaiIconDark from '@resources/icons/brands/openai/fallback_lobehub/png_dark/openai.png';
import openaiIconLight from '@resources/icons/brands/openai/fallback_lobehub/png_light/openai.png';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { ConnectorStatusBadge, type ConnectorStatus } from './ConnectorStatusBadge';

type ConnectorCardEntry = {
	readonly id: string;
	readonly connectorId: string;
	readonly name: string;
	readonly description: string;
	readonly iconId?: string;
};

type ConnectorEntry = Awaited<ReturnType<typeof window.connectors.list>>[string];

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
		const match = path.match(/brands\/([^/]+)\/fallback_lobehub\/png_(light|dark)\/\1\.png$/);
		if (!match) continue;
		const [, id, theme] = match;
		if (!id || (theme !== 'light' && theme !== 'dark')) continue;
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

const CONNECTOR_ICON_ASSETS = buildIconAssets();

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a'));
}

function connectorStatus(connector: ConnectorEntry): ConnectorStatus {
	if (connector.enabled === false) return 'disabled';
	if (connector.last_error) return 'error';
	return 'configured';
}

export function ConnectorCard({
	catalogEntry,
	icon,
	connecting,
	connector,
	onConnect,
	onViewDetails,
}: {
	readonly catalogEntry: ConnectorDefault;
	readonly icon?: ConnectorIconAsset;
	readonly connecting?: boolean;
	readonly connector?: {
		readonly id: string;
		readonly entry: ConnectorEntry;
	};
	readonly onConnect: () => void;
	readonly onViewDetails?: () => void;
}): React.JSX.Element {
	const status = connector ? connectorStatus(connector.entry) : undefined;
	const connected = status === 'configured';
	const disabled = status === 'disabled';
	const hasDetails = typeof onViewDetails === 'function';
	const title = catalogEntry.name;

	const iconId = (catalogEntry.iconId ?? catalogEntry.id) || (connector?.id ?? catalogEntry.connectorId);
	const asset = icon ?? (iconId ? CONNECTOR_ICON_ASSETS[iconId] : undefined);
	const lightSrc = asset?.light ?? openaiIconLight;
	const darkSrc = asset?.dark ?? openaiIconDark;

	return (
		<Item
			variant="outline"
			size="md"
			onClick={(event) => {
				if (isInteractiveTarget(event.target)) return;
				if (hasDetails) {
					onViewDetails();
					return;
				}
				if (!connected && !disabled) onConnect();
			}}
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ItemMedia
				className={cn(
					'size-8 shrink-0 overflow-hidden rounded-md border border-border/70 bg-background p-0'
				)}
			>
				<img src={lightSrc} alt="" draggable={false} className="size-full object-contain dark:hidden" />
				<img src={darkSrc} alt="" draggable={false} className="hidden size-full object-contain dark:block" />
			</ItemMedia>
			<ItemContent className="min-w-0 flex-col items-start gap-1">
				<div className="flex max-w-full items-center gap-2">
					<ItemTitle className="min-w-0 truncate">{title}</ItemTitle>
					{status ? (
						<ConnectorStatusBadge status={status} />
					) : (
						<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
							Not connected
						</Badge>
					)}
				</div>
				<div className="line-clamp-1 max-w-full text-[12px] text-muted-foreground">
					{catalogEntry.description}
				</div>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end gap-1.5">
				{!connected && !disabled && (
					<Button
						variant="outline"
						size="sm"
						disabled={connecting}
						onClick={(event) => {
							event.stopPropagation();
							onConnect();
						}}
						aria-label={`Connect ${title}`}
					>
						<PlugZap className="size-3.5" />
						{connecting ? 'Connecting' : 'Connect'}
					</Button>
				)}
				{hasDetails && (
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={(event) => {
							event.stopPropagation();
							onViewDetails();
						}}
						aria-label={`View ${title} details`}
					>
						<ChevronRight className="size-3" />
					</Button>
				)}
			</ItemActions>
		</Item>
	);
}
