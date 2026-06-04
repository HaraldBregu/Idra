import React from 'react';
import { ChevronRight, PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { SettingsConnectorCatalogEntry } from '../catalog';
import { ConnectorIcon } from './ConnectorIcon';
import { ConnectorStatusBadge } from './ConnectorStatusBadge';

type ConnectorSummary = Awaited<ReturnType<typeof window.connectors.list>>[number];

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a'));
}

export function ConnectorCard({
	catalogEntry,
	connecting,
	connector,
	onConnect,
	onViewDetails,
}: {
	readonly catalogEntry: SettingsConnectorCatalogEntry;
	readonly connecting?: boolean;
	readonly connector?: ConnectorSummary;
	readonly onConnect: () => void;
	readonly onViewDetails?: () => void;
}): React.JSX.Element {
	const connected = connector?.status === 'configured';
	const disabled = connector?.status === 'disabled';
	const hasDetails = typeof onViewDetails === 'function';
	const title = connector?.name ?? catalogEntry.name;

	return (
		<Item
			variant="outline"
			size="md"
			onClick={(event) => {
				if (isInteractiveTarget(event.target)) return;
				if (hasDetails) onViewDetails();
			}}
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ConnectorIcon
				connectorId={connector?.connectorId ?? catalogEntry.connectorId}
				directConnectorId={catalogEntry.directConnectorId}
				name={title}
			/>
			<ItemContent className="min-w-0 flex-col items-start gap-1">
				<div className="flex max-w-full items-center gap-2">
					<ItemTitle className="min-w-0 truncate">{title}</ItemTitle>
					{connector ? (
						<ConnectorStatusBadge status={connector.status} />
					) : (
						<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
							Not connected
						</Badge>
					)}
				</div>
				<div className="line-clamp-1 max-w-full text-[12px] text-muted-foreground">
					{connector?.connectedAccount ?? catalogEntry.description}
				</div>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end gap-1.5">
				{!connected && !disabled && (
					<Button
						variant="outline"
						size="sm"
						disabled={connecting}
						onClick={onConnect}
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
						onClick={onViewDetails}
						aria-label={`View ${title} details`}
					>
						<ChevronRight className="size-3" />
					</Button>
				)}
			</ItemActions>
		</Item>
	);
}
