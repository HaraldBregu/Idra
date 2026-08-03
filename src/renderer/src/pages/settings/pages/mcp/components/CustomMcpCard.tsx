import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { McpData } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { McpServerForm } from './McpServerForm';

export function CustomMcpCard({
	id,
	entry,
	onSave,
	onRemove,
}: {
	readonly id: string;
	readonly entry: McpData;
	readonly onSave: (id: string, entry: McpData) => Promise<void>;
	readonly onRemove: (id: string) => Promise<void>;
}): React.JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const [editing, setEditing] = useState(false);
	const [removing, setRemoving] = useState(false);
	const description = entry.type === 'http' ? entry.url : entry.command;

	const remove = async (): Promise<void> => {
		setRemoving(true);
		try {
			await onRemove(id);
		} finally {
			setRemoving(false);
		}
	};

	return (
		<Card size="sm">
			<Collapsible open={expanded} onOpenChange={setExpanded}>
				<CardHeader
					className={cn('cursor-pointer items-center', expanded && 'border-b')}
					role="button"
					tabIndex={0}
					aria-expanded={expanded}
					onClick={() => setExpanded((value) => !value)}
					onKeyDown={(event) => {
						if (event.key !== 'Enter' && event.key !== ' ') return;
						event.preventDefault();
						setExpanded((value) => !value);
					}}
				>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate">{entry.name ?? id}</CardTitle>
						<p className="truncate font-mono text-xs text-muted-foreground">{description}</p>
					</div>
					<CardAction className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Edit ${entry.name ?? id}`}
							onClick={() => {
								setExpanded(true);
								setEditing(true);
							}}
						>
							<Pencil className="size-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-destructive hover:text-destructive"
							aria-label={`Remove ${entry.name ?? id}`}
							disabled={removing}
							onClick={() => void remove()}
						>
							<Trash2 className="size-3" />
						</Button>
					</CardAction>
				</CardHeader>
				<CollapsibleContent>
					<CardContent className="pt-4">
						{editing ? (
							<McpServerForm
								initial={{ id, entry }}
								onSubmit={async (nextId, nextEntry) => {
									await onSave(nextId, nextEntry);
									setEditing(false);
								}}
								onCancel={() => setEditing(false)}
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								{entry.type === 'http' ? 'Remote HTTP server' : 'Local command server'}
							</p>
						)}
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
