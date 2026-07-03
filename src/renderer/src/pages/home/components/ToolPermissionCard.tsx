import { useState, type ReactElement } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentToolPermissionDecision } from '@/lib/compat';
import type { PendingToolPermission } from '../context';

const TOOL_TITLES: Record<string, string> = {
	write: 'Write file',
	edit: 'Edit file',
};

function toolTitle(toolName: string): string {
	return TOOL_TITLES[toolName] ?? toolName.charAt(0).toUpperCase() + toolName.slice(1);
}

function filePath(input: unknown): string | undefined {
	if (!input || typeof input !== 'object') return undefined;
	const path = (input as Record<string, unknown>).path;
	return typeof path === 'string' && path.length > 0 ? path : undefined;
}

export function ToolPermissionCard({
	permission,
}: {
	readonly permission: PendingToolPermission;
}): ReactElement {
	const [responded, setResponded] = useState(false);
	const path = filePath(permission.input);

	const respond = (decision: AgentToolPermissionDecision): void => {
		if (responded) return;
		setResponded(true);
		void window.agent
			.respondToolPermission(permission.toolCallId, decision)
			.catch(() => setResponded(false));
	};

	return (
		<div className="mb-2 w-full rounded-lg border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5">
			<div className="flex items-start gap-2">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
					<ShieldAlert className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium leading-5">
						{toolTitle(permission.toolName)}
					</p>
					<p className="truncate text-xs leading-5 text-muted-foreground">
						{path ?? `The agent wants to run ${permission.toolName}.`}
					</p>
				</div>
			</div>
			<div className="mt-3 flex flex-wrap justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={responded}
					onClick={() => respond('approve_always')}
				>
					Always allow
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={responded}
					onClick={() => respond('reject')}
				>
					Deny
				</Button>
				<Button
					type="button"
					variant="default"
					size="sm"
					disabled={responded}
					onClick={() => respond('approve')}
				>
					Allow once
				</Button>
			</div>
		</div>
	);
}
