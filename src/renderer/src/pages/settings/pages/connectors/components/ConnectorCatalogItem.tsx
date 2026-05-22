import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
		<Collapsible className="rounded-lg border border-border/70 bg-card">
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				<ConnectorIcon directConnectorId={item.directConnectorId} name={item.name} />
				<span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.name}</span>
				<Button
					variant="outline"
					size="xs"
					onClick={(e) => { e.stopPropagation(); onAdd(); }}
				>
					<Plus className="size-3" />
					Add
				</Button>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t border-border/60 px-3 py-2.5">
				{item.setupInstructions.length > 0 && (
					<div className="mb-2.5">
						<p className="mb-1 text-[11px] font-medium text-foreground">Setup</p>
						<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4 text-muted-foreground">
							{item.setupInstructions.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</div>
				)}
				{item.tools.length > 0 && (
					<div>
						<p className="mb-1 text-[11px] font-medium text-foreground">Tools</p>
						<div className="flex flex-wrap gap-1">
							{item.tools.map((tool) => (
								<span
									key={tool}
									className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
								>
									{tool}
								</span>
							))}
						</div>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}
