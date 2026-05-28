import { ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { ConnectorIcon } from './ConnectorIcon';

type CatalogItem = Awaited<ReturnType<Window['connectors']['catalog']>>[number];

export function ConnectorCatalogItem({
	item,
	onConfigure,
}: {
	readonly item: CatalogItem;
	readonly onConfigure: () => void;
}) {
	return (
		<Item
			variant="outline"
			size="md"
			onClick={onConfigure}
			className="cursor-pointer rounded-lg border border-border/70 bg-card text-left hover:border-foreground/15 hover:bg-card/95"
		>
			<ConnectorIcon directConnectorId={item.directConnectorId} name={item.name} />
			<ItemContent className="min-w-0">
				<ItemTitle className="min-w-0 truncate">{item.name}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<ChevronRight className="size-3.5 text-muted-foreground" />
			</ItemActions>
		</Item>
	);
}
