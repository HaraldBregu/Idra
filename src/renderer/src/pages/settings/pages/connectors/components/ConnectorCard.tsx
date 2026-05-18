import React from 'react';
import { Edit3, LogIn, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import type { ConnectorView } from '../../../../../../../shared/connectors';
import { ConnectorStatusBadge } from './ConnectorStatusBadge';

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a,input,textarea,select,label,[role="switch"]'));
}

export function ConnectorCard({
	connector,
	busy,
	connecting,
	onToggle,
	onRefreshTools,
	onConnect,
	onEdit,
	onRemove,
	onViewDetails,
}: {
	readonly connector: ConnectorView;
	readonly busy: boolean;
	readonly connecting?: boolean;
	readonly onToggle: () => void;
	readonly onRefreshTools: () => void;
	readonly onConnect: () => void;
	readonly onEdit: () => void;
	readonly onRemove: () => void;
	readonly onViewDetails: () => void;
}): React.JSX.Element {
	return (
		<Card
			size="sm"
			role="button"
			tabIndex={0}
			onClick={(event) => {
				if (isInteractiveTarget(event.target)) return;
				onViewDetails();
			}}
			onKeyDown={(event) => {
				if (isInteractiveTarget(event.target)) return;
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				onViewDetails();
			}}
			className="cursor-pointer gap-0 rounded-lg py-0 shadow-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<Item variant="outline" size="md">
				<ItemMedia variant="icon">
					<Plug className="size-3" strokeWidth={1.8} />
				</ItemMedia>
				<ItemContent className="min-w-0">
					<div className="min-w-0">
						<ItemTitle>{connector.name}</ItemTitle>
						<div className="mt-0.5 flex flex-wrap items-center gap-1">
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{connector.connectorId}
							</Badge>
							<ConnectorStatusBadge status={connector.status} />
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								{connector.toolsCount} tools
							</Badge>
							{connector.deferLoading && (
								<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
									Deferred
								</Badge>
							)}
						</div>
					</div>
				</ItemContent>
				<ItemActions className="ml-auto flex-none justify-end gap-1">
					<label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
						<Switch
							size="sm"
							checked={connector.enabled}
							disabled={busy}
							onCheckedChange={onToggle}
							aria-label={connector.enabled ? 'Disable connector' : 'Enable connector'}
						/>
					</label>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onConnect}
						disabled={busy || connector.authKind !== 'google_oauth'}
						title="Connect OAuth"
					>
						<LogIn className="size-3" />
						<span className="sr-only">
							{connecting ? 'Connecting' : connector.status === 'configured' ? 'Reconnect' : 'Connect'}
						</span>
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={onRefreshTools}
						disabled={busy}
						title="Refresh tools"
					>
						<RefreshCw className="size-3" />
						<span className="sr-only">Refresh tools</span>
					</Button>
					<Button variant="ghost" size="icon-xs" onClick={onEdit} disabled={busy} title="Edit">
						<Edit3 className="size-3" />
						<span className="sr-only">Edit</span>
					</Button>
					<Button variant="ghost" size="icon-xs" onClick={onRemove} disabled={busy} title="Remove">
						<Trash2 className="size-3" />
						<span className="sr-only">Remove</span>
					</Button>
				</ItemActions>
			</Item>
		</Card>
	);
}
