import { useState, type ReactElement } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardAction,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { AgentToolPermissionDecision } from '@/lib/compat';
import type { PendingToolPermission } from '../context';

const TOOL_ACTIONS: Record<string, string> = {
	read_file: 'read files',
	write_file: 'write files',
	edit_file: 'edit files',
	apply_patch: 'apply this patch',
	exec_command: 'run this command',
};

export function ToolPermissionCard({
	permission,
}: {
	readonly permission: PendingToolPermission;
}): ReactElement {
	const [responding, setResponding] = useState(false);
	const [error, setError] = useState<string>();
	const input = permission.input && typeof permission.input === 'object'
		? permission.input as Record<string, unknown>
		: {};
	const detail = typeof input.command === 'string'
		? input.command
		: typeof input.path === 'string'
			? input.path
			: undefined;
	const action = TOOL_ACTIONS[permission.toolName] ?? `use ${permission.toolName}`;
	const hostExecution = permission.reason === 'host_execution';

	const respond = (decision: AgentToolPermissionDecision): void => {
		if (responding) return;
		setResponding(true);
		setError(undefined);
		void window.agent
			.respondToolPermission(
				{
					approvalId: permission.approvalId,
					runId: permission.runId,
					toolName: permission.toolName,
					inputFingerprint: permission.inputFingerprint,
				},
				decision
			)
			.catch((cause: unknown) => {
				setResponding(false);
				setError(cause instanceof Error ? cause.message : 'Could not record your response.');
			});
	};

	return (
		<Card size="sm" className="mb-2 w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ShieldAlert className="size-4 shrink-0 text-muted-foreground" />
					{`Allow Friday to ${action}?`}
				</CardTitle>
				<CardAction>
					<Badge variant={hostExecution ? 'destructive' : 'secondary'}>
						{hostExecution ? 'Host access' : 'Outside trusted locations'}
					</Badge>
				</CardAction>
			</CardHeader>
			<CardContent className="space-y-2">
				{permission.targets.length > 0 && (
					<div>
						<p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Location</p>
						<div className="space-y-1">
							{permission.targets.map((target) => (
								<p key={target} className="break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs">{target}</p>
							))}
						</div>
					</div>
				)}
				<p className="text-xs text-muted-foreground">
					{hostExecution
						? 'This runs outside the filesystem sandbox and can access other locations.'
						: 'This location is not trusted for the requested tool.'}
				</p>
				{detail && <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-muted-foreground"><code>{detail}</code></pre>}
				{error && <p className="text-xs text-destructive" aria-live="polite">{error}</p>}
			</CardContent>
			<CardFooter className="flex flex-wrap justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" disabled={responding} onClick={() => respond('reject')}>Deny</Button>
				{permission.persistable && (
					<Button type="button" variant="outline" size="sm" disabled={responding} onClick={() => respond('approve_always')}>Trust this location</Button>
				)}
				<Button type="button" size="sm" disabled={responding} onClick={() => respond('approve')}>Allow once</Button>
			</CardFooter>
		</Card>
	);
}
