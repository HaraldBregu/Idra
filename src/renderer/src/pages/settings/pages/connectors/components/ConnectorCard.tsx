import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import type { ConnectorView } from '../../../../../../../shared/connector';
import { ConnectorIcon } from './ConnectorIcon';

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a,input,textarea,select,label,[role="switch"]'));
}

export function ConnectorCard({
	connector,
	busy,
	connecting,
	onConnectOAuth,
	onToggle,
	onViewDetails,
}: {
	readonly connector: ConnectorView;
	readonly busy: boolean;
	readonly connecting: boolean;
	readonly onConnectOAuth: () => void;
	readonly onToggle: () => void;
	readonly onViewDetails: () => void;
}): React.JSX.Element {
	const canConnectOAuth = connector.authKind === 'google_oauth';

	return (
		<Item
			variant="outline"
			size="md"
			onClick={(event) => {
				if (isInteractiveTarget(event.target)) return;
				onViewDetails();
			}}
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ConnectorIcon connectorId={connector.connectorId} name={connector.name} />
			<ItemContent className="min-w-0">
				<ItemTitle className="min-w-0 truncate">{connector.name}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end gap-1">
				{canConnectOAuth && (
					<Button
						variant={connector.status === 'configured' ? 'ghost' : 'outline'}
						size="xs"
						disabled={busy || connecting}
						onClick={onConnectOAuth}
					>
						{connecting ? 'Connecting...' : connector.status === 'configured' ? 'Reconnect' : 'Connect'}
					</Button>
				)}
				<Switch
					checked={connector.enabled}
					disabled={busy}
					onCheckedChange={onToggle}
					aria-label={connector.enabled ? 'Disable connector' : 'Enable connector'}
				/>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={onViewDetails}
					aria-label={`View ${connector.name} details`}
				>
					<ChevronRight className="size-3" />
				</Button>
			</ItemActions>
		</Item>
	);
}
