import React from 'react';
import { Edit3, Plug, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
		<Card className="gap-0 py-0">
			<CardContent className="flex flex-col gap-4 p-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40">
							<Plug className="size-4 text-foreground" />
						</div>
						<div className="min-w-0">
							<h3 className="truncate text-sm font-semibold">{connector.name}</h3>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<Badge variant="outline">{connector.connectorId}</Badge>
								<Badge variant="outline">{connector.serverLabel}</Badge>
								<ConnectorStatusBadge status={connector.status} />
							</div>
						</div>
					</div>
					<Button variant="outline" size="sm" onClick={onViewDetails}>
						Tools
					</Button>
				</div>

				<div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground sm:grid-cols-3">
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

				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={connector.requireApproval === 'never' ? 'secondary' : 'outline'}>
						Approval: {connector.requireApproval.replaceAll('_', ' ')}
					</Badge>
					{connector.deferLoading && <Badge variant="outline">Deferred loading</Badge>}
				</div>

				{connector.lastError && (
					<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
						{connector.lastError}
					</p>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onClick={onToggle} disabled={busy}>
						{connector.enabled ? 'Disable' : 'Enable'}
					</Button>
					<Button variant="outline" size="sm" onClick={onRefreshTools} disabled={busy}>
						<RefreshCw className="size-3.5" />
						Refresh tools
					</Button>
					<Button variant="ghost" size="icon-sm" onClick={onEdit} disabled={busy} title="Edit">
						<Edit3 className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onRemove}
						disabled={busy}
						title="Remove"
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
