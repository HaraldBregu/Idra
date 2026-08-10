import { useState, type ReactElement } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentToolPermissionDecision } from '@/lib/compat';
import type { PendingToolPermission } from '../context';

const TOOL_ACTIONS: Record<string, string> = {
	write: 'write this file',
	edit: 'edit this file',
	apply_patch: 'apply this patch',
	exec: 'run this command',
};

function toolDetail(permission: PendingToolPermission): string | undefined {
	if (!permission.input || typeof permission.input !== 'object') return undefined;
	const { path, command } = permission.input as Record<string, unknown>;
	const value = permission.toolName === 'exec' ? command : path;
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function ToolPermissionCard({
	permission,
}: {
	readonly permission: PendingToolPermission;
}): ReactElement {
	const [responded, setResponded] = useState(false);
	const detail = toolDetail(permission);
	const action = TOOL_ACTIONS[permission.toolName] ?? `use ${permission.toolName}`;

	const respond = (decision: AgentToolPermissionDecision): void => {
		if (responded) return;
		setResponded(true);
		void window.agent
			.respondToolPermission(
				{
					approvalId: permission.approvalId,
					runId: permission.runId,
					origin: permission.origin,
					toolName: permission.toolName,
					inputFingerprint: permission.inputFingerprint,
				},
				decision
			)
			.catch(() => setResponded(false));
	};

	return (
		<div className="mb-2 w-full max-w-2xl rounded-lg border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5">
			<div className="flex items-center gap-2">
				<ShieldAlert className="size-4 shrink-0 text-muted-foreground" />
				<p className="text-sm font-medium leading-5">{`Allow Friday to ${action}?`}</p>
			</div>
			{detail && (
				<p className="mt-2 max-h-24 overflow-y-auto break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground">
					{detail}
				</p>
			)}
			<div className="mt-3 flex flex-wrap justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={responded}
					onClick={() => respond('reject')}
				>
					Deny
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={responded}
					onClick={() => respond('approve_always')}
				>
					Always allow
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
