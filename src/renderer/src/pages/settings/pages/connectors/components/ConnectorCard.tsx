import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { ConnectorView } from '../../../../../../../shared/connector';
import { ConnectorIcon } from './ConnectorIcon';

function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && Boolean(target.closest('button,a'));
}

export function ConnectorCard({
	connector,
	onViewDetails,
}: {
	readonly connector: ConnectorView;
	readonly onViewDetails: () => void;
}): React.JSX.Element {
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
