import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { ConnectorView } from '../../../../../../../shared/connector';
import { ConnectorIcon } from './ConnectorIcon';

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
			onClick={onViewDetails}
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ConnectorIcon connectorId={connector.connectorId} name={connector.name} />
			<ItemContent className="min-w-0">
				<ItemTitle className="min-w-0 truncate">{connector.name}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<ChevronRight className="size-3.5 text-muted-foreground" />
			</ItemActions>
		</Item>
	);
}
