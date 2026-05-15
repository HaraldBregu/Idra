import React from 'react';
import { Edit3, Plug, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { ConnectorView } from '../../../../../shared/connectors';
import { ConnectorStatusBadge } from './ConnectorStatusBadge';

function formatLastRefreshed(value?: string): string {
	if (!value) return 'Never';
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

export function ConnectorCard({
	connector,
	busy,
	onToggle,
	onRefreshTools,
	onEdit,
	onRemove,
	onViewDetails,
}: {
	readonly connector: ConnectorView;
	readonly busy: boolean;
	readonly onToggle: () => void;
	readonly onRefreshTools: () => void;
	readonly onEdit: () => void;
	readonly onRemove: () => void;
	readonly onViewDetails: () => void;
}): React.JSX.Element {
	return (
		<Card size="sm" className="gap-0 py-0">
			<CardContent className="flex flex-col p-0">
				<div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/70 px-3 py-2">
					<div className="flex min-w-0 items-center gap-2">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40">
							<Plug className="size-3.5 text-foreground" />
						</div>
						<div className="min-w-0">
							<h3 className="truncate text-[13px] font-semibold">{connector.name}</h3>
							<div className="mt-1 flex flex-wrap items-center gap-1.5">
								<Badge variant="outline" className="text-[10px]">
									{connector.connectorId}
								</Badge>
								<Badge variant="outline" className="text-[10px]">
									{connector.serverLabel}
								</Badge>
								<ConnectorStatusBadge status={connector.status} />
							</div>
						</div>
					</div>
					<Button variant="outline" size="xs" onClick={onViewDetails}>
						<Wrench className="size-3" />
						Tools
					</Button>
				</div>

				<div className="grid gap-2 border-b border-border/70 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground sm:grid-cols-3">
					<div>
						<span className="block font-medium text-foreground">{connector.toolsCount}</span>
						<span>Catalog tools</span>
					</div>
					<div>
						<span className="block font-medium text-foreground">
							{connector.allowedToolsCount || 'All'}
						</span>
						<span>Allowed tools</span>
					</div>
					<div>
						<span className="block font-medium text-foreground">
							{formatLastRefreshed(connector.lastRefreshedAt)}
						</span>
						<span>Last refreshed</span>
					</div>
				</div>

				{connector.lastError && (
					<p className="border-b border-border/70 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
						{connector.lastError}
					</p>
				)}

				<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
					<div className="flex flex-wrap items-center gap-1.5">
						<Badge
							variant={connector.requireApproval === 'never' ? 'secondary' : 'outline'}
							className="text-[10px]"
						>
							Approval: {connector.requireApproval.replaceAll('_', ' ')}
						</Badge>
						{connector.deferLoading && (
							<Badge variant="outline" className="text-[10px]">
								Deferred loading
							</Badge>
						)}
					</div>
					<div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
						<label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							Enabled
							<Switch
								size="sm"
								checked={connector.enabled}
								disabled={busy}
								onCheckedChange={() => onToggle()}
								aria-label={connector.enabled ? 'Disable connector' : 'Enable connector'}
							/>
						</label>
						<Button
							variant="outline"
							size="xs"
							className="w-7 px-0 sm:w-auto sm:px-2.5"
							onClick={onRefreshTools}
							disabled={busy}
							title="Refresh tools"
							aria-label="Refresh tools"
						>
							<RefreshCw className="size-3" />
							<span className="hidden sm:inline">Refresh tools</span>
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onEdit}
							disabled={busy}
							title="Edit"
							aria-label="Edit connector"
						>
							<Edit3 className="size-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={onRemove}
							disabled={busy}
							title="Remove"
							aria-label="Remove connector"
						>
							<Trash2 className="size-3" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
