import React, { useState } from 'react';
import type { McpData } from '@shared/mcp_types';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { McpServerForm } from './McpServerForm';

export function McpServerDialog({
	trigger,
	initial,
	onSubmit,
	onRemove,
}: {
	readonly trigger: React.ReactElement;
	readonly initial?: { readonly id: string; readonly entry: McpData };
	readonly onSubmit: (id: string, entry: McpData) => Promise<void>;
	readonly onRemove?: () => Promise<void>;
}): React.JSX.Element {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={trigger} />
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{initial ? 'Edit MCP server' : 'Add MCP server'}</DialogTitle>
					<DialogDescription>
						Remote MCP server over HTTP or local MCP server started as a command.
					</DialogDescription>
				</DialogHeader>
				{open && (
					<McpServerForm
						initial={initial}
						onSubmit={async (id, entry) => {
							await onSubmit(id, entry);
							setOpen(false);
						}}
						onCancel={() => setOpen(false)}
						onRemove={
							onRemove
								? async () => {
									await onRemove();
									setOpen(false);
								}
								: undefined
						}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
