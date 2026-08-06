import React, { useState } from 'react';
import { ChevronDown, FlaskConical, Pencil, RefreshCw } from 'lucide-react';
import type { McpData, McpServerInfo, McpTestResult } from '@shared/mcp_types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { McpServerDialog } from './McpServerDialog';

export function McpLocalServerCard({
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
	readonly onSave: (id: string, data: McpData) => Promise<void>;
	readonly onRemove?: () => Promise<void>;
}): React.JSX.Element {
	const [expanded, setExpanded] = useState(false);
	const [updating, setUpdating] = useState(false);
	const [actionError, setActionError] = useState('');
	const title = server.data.name ?? server.id;
	const description = server.data.type === 'stdio' ? server.data.command : server.data.url;
	const status = server.data.enabled === false
		? 'Disabled'
		: testing
			? 'Testing'
			: testResult?.ok
				? 'Connected'
				: testResult
					? 'Error'
					: 'Configured';
	const variant = testResult && !testResult.ok ? 'destructive' : testResult?.ok ? 'default' : 'outline';
	const environment = server.data.type === 'stdio'
		? Object.entries(server.data.env ?? {}).map(([key, value]) => `${key}=${value}`).join('\n')
		: '';

	return (
		<Card size="sm" className="gap-0 py-0">
			<Collapsible open={expanded} onOpenChange={setExpanded}>
				<CollapsibleTrigger
					className="group flex w-full items-center gap-3 px-3 py-2.5 text-left"
					aria-label={`${expanded ? 'Hide' : 'Show'} ${title} details`}
				>
					<div className="min-w-0 flex-1">
						<div className="truncate text-[13px] font-medium leading-4 text-foreground">{title}</div>
						<p className="mt-0.5 truncate font-mono text-[11px] leading-4 text-muted-foreground">
							{description}
						</p>
					</div>
					<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
				</CollapsibleTrigger>

				<CollapsibleContent className="border-t border-border/60">
					<div className="grid gap-3 px-3 py-3">
						<div className="flex flex-wrap items-center gap-1.5">
							<Badge variant={variant} className="h-5 px-1.5 text-[10px]">{status}</Badge>
							<Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
								{server.source === 'local' ? 'Local package' : 'Configured command'}
							</Badge>
						</div>

						<dl className="grid gap-2 text-[11px] sm:grid-cols-2">
							<div className="min-w-0">
								<dt className="text-muted-foreground">ID</dt>
								<dd className="truncate font-mono text-foreground">{server.id}</dd>
							</div>
							{server.data.type === 'stdio' && (
								<>
									<div className="min-w-0">
										<dt className="text-muted-foreground">Command</dt>
										<dd className="truncate font-mono text-foreground">{server.data.command}</dd>
									</div>
									<div className="min-w-0">
										<dt className="text-muted-foreground">Arguments</dt>
										<dd className="truncate font-mono text-foreground">{server.data.args?.join(' ') || '—'}</dd>
									</div>
									<div className="min-w-0">
										<dt className="text-muted-foreground">Working directory</dt>
										<dd className="truncate font-mono text-foreground">{server.data.cwd || '—'}</dd>
									</div>
								</>
							)}
							<div className="min-w-0">
								<dt className="text-muted-foreground">Approval</dt>
								<dd className="text-foreground">{server.data.require_approval ?? 'Default'}</dd>
							</div>
							<div className="min-w-0">
								<dt className="text-muted-foreground">Tool loading</dt>
								<dd className="text-foreground">{server.data.defer_loading ? 'Deferred' : 'Immediate'}</dd>
							</div>
							{server.path && (
								<div className="min-w-0 sm:col-span-2">
									<dt className="text-muted-foreground">Package path</dt>
									<dd className="truncate font-mono text-foreground">{server.path}</dd>
								</div>
							)}
							{environment && (
								<div className="min-w-0 sm:col-span-2">
									<dt className="text-muted-foreground">Environment</dt>
									<dd className="whitespace-pre-wrap break-all font-mono text-foreground">{environment}</dd>
								</div>
							)}
						</dl>

						{server.diagnostic && <p className="text-[11px] text-destructive">{server.diagnostic}</p>}
						{testResult && (
							<p className={testResult.ok ? 'text-[11px] text-muted-foreground' : 'text-[11px] text-destructive'} role="status">
								{testResult.ok
									? `${testResult.toolCount} tool${testResult.toolCount === 1 ? '' : 's'} · ${testResult.durationMs} ms`
									: testResult.error || 'Unable to connect.'}
							</p>
						)}
						{actionError && <p className="text-[11px] text-destructive" role="alert">{actionError}</p>}

						<div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
							<label className="flex items-center gap-2 text-[11px] text-muted-foreground">
								<Switch
									checked={server.data.enabled !== false}
									disabled={updating}
									onCheckedChange={(enabled) => {
										setUpdating(true);
										setActionError('');
										void onSave(server.id, { ...server.data, enabled })
											.catch((error) => setActionError(error instanceof Error ? error.message : String(error)))
											.finally(() => setUpdating(false));
									}}
									aria-label={`${server.data.enabled === false ? 'Enable' : 'Disable'} ${title}`}
								/>
								Enabled
							</label>
							<div className="flex items-center gap-1.5">
								<Button
									variant="outline"
									size="xs"
									disabled={testing || updating}
									onClick={() => void onTest()}
									aria-label={`${testing ? 'Testing' : 'Test'} ${title}`}
								>
									{testing ? <RefreshCw className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
									{testing ? 'Testing' : 'Test'}
								</Button>
								<McpServerDialog
									initial={{ id: server.id, entry: server.data }}
									trigger={
										<Button variant="outline" size="xs" aria-label={`Edit ${title}`}>
											<Pencil className="size-3" />
											Configure
										</Button>
									}
									onSubmit={onSave}
									onRemove={onRemove}
								/>
							</div>
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}
