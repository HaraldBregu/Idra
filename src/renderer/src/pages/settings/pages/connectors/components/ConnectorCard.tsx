import React from 'react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import type { ConnectorView } from '../../../../../../../shared/connectors';

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a,input,textarea,select,label,[role="switch"]'));
}

export function ConnectorCard({
	connector,
	busy,
	onToggle,
	onViewDetails,
}: {
	readonly connector: ConnectorView;
	readonly busy: boolean;
	readonly onToggle: () => void;
	readonly onViewDetails: () => void;
}): React.JSX.Element {
	return (
		<Item
			variant="outline"
			size="md"
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
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ItemContent className="min-w-0">
				<ItemTitle className="min-w-0 truncate">{connector.name}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<Switch
					size="sm"
					checked={connector.enabled}
					disabled={busy}
					onCheckedChange={onToggle}
					aria-label={connector.enabled ? 'Disable connector' : 'Enable connector'}
				/>
			</ItemActions>
		</Item>
	);
}
