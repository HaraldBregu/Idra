import React from 'react';
import { FlaskConical, Pencil, RefreshCw } from 'lucide-react';
import type { McpData, McpServerInfo, McpTestResult } from '@shared/mcp_types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { McpServerDialog } from './McpServerDialog';

export function McpServerRow({
	server,
	testing,
	testResult,
	onTest,
	onSave,
	onRemove,
}: {
	readonly server: McpServerInfo;
	readonly testing: boolean;
	readonly testResult?: McpTestResult;
	readonly onTest: () => Promise<void>;
	readonly onSave?: (id: string, data: McpData) => Promise<void>;
	readonly onRemove?: () => Promise<void>;
}): React.JSX.Element {
	const description = server.data.type === 'http' ? server.data.url : server.data.command;
	const status = testing
		? 'Testing'
		: testResult?.ok
			? 'Connected'
			: testResult
				? 'Error'
				: server.data.enabled === false
					? 'Disabled'
					: 'Configured';
	const variant = testResult && !testResult.ok ? 'destructive' : testResult?.ok ? 'default' : 'outline';

	return (
		<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
				<div className="flex max-w-full items-center gap-2">
					<ItemTitle className="min-w-0 truncate">{server.data.name ?? server.id}</ItemTitle>
					<Badge variant={variant} className="h-4 px-1.5 text-[10px]">
						{status}
					</Badge>
					{server.source === 'local' && (
						<Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
							Local package
						</Badge>
					)}
				</div>
				<p className="max-w-full truncate font-mono text-[11px] text-muted-foreground">
					{description}
				</p>
				{server.path && (
					<p className="max-w-full truncate text-[11px] text-muted-foreground">{server.path}</p>
				)}
				{server.diagnostic && (
					<p className="max-w-full text-[11px] text-destructive">{server.diagnostic}</p>
				)}
				{testResult && (
					<p className={testResult.ok ? 'text-[11px] text-muted-foreground' : 'text-[11px] text-destructive'} role="status">
						{testResult.ok
							? `${testResult.toolCount} tool${testResult.toolCount === 1 ? '' : 's'} · ${testResult.durationMs} ms`
							: testResult.error || 'Unable to connect.'}
					</p>
				)}
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end gap-1.5">
				<Button variant="outline" size="xs" disabled={testing} onClick={() => void onTest()}>
					{testing ? <RefreshCw className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
					{testing ? 'Testing' : 'Test'}
				</Button>
				{onSave && (
					<>
						<Switch
							checked={server.data.enabled !== false}
							onCheckedChange={(enabled) => void onSave(server.id, { ...server.data, enabled })}
							aria-label={`${server.data.enabled === false ? 'Enable' : 'Disable'} ${server.data.name ?? server.id}`}
						/>
						<McpServerDialog
							initial={{ id: server.id, entry: server.data }}
							trigger={
								<Button variant="ghost" size="icon-xs" aria-label={`Edit ${server.data.name ?? server.id}`}>
									<Pencil className="size-3" />
								</Button>
							}
							onSubmit={onSave}
							onRemove={onRemove}
						/>
					</>
				)}
			</ItemActions>
		</Item>
	);
}
