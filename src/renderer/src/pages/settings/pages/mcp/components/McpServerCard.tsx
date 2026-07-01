import React from 'react';
import { ChevronRight, PlugZap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { ConnectorStatusBadge, type ConnectorStatus } from './ConnectorStatusBadge';

type ConnectorCardEntry = {
	readonly id: string;
	readonly name: string;
	readonly description: string;
};

type ConnectorEntry = Awaited<ReturnType<typeof window.agent.mcpList>>[string];

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
	connecting,
	connector,
	onConnect,
	onViewDetails,
}: {
	readonly catalogEntry: ConnectorCardEntry;
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
				<div className="line-clamp-1 max-w-full font-mono text-[12px] text-muted-foreground">
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
