import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import type { ConnectorCatalog } from '../hooks/useConnectors';
import { ConnectorIcon } from './ConnectorIcon';

export function ConnectorCatalogItem({
	item,
	onAdd,
}: {
	readonly item: ConnectorCatalog[number];
	readonly onAdd: () => void;
}): React.JSX.Element {
	return (
		<Item
			variant="outline"
			size="md"
			className="rounded-lg border border-border/70 bg-card"
		>
			<ConnectorIcon directConnectorId={item.directConnectorId} name={item.name} />
			<ItemContent className="min-w-0">
				<ItemTitle className="min-w-0 truncate">{item.name}</ItemTitle>
				<ItemDescription className="truncate">{item.description}</ItemDescription>
			</ItemContent>
			<ItemActions className="ml-auto flex-none">
				<Button variant="outline" size="xs" onClick={onAdd}>
					<Plus className="size-3" />
					Add
				</Button>
			</ItemActions>
		</Item>
	);
}
