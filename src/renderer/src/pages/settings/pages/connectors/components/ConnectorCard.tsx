import React from 'react';
import { Edit3, ExternalLink, LogIn, Plug, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { handleExternalLinkClick } from '@/lib/external-links';
import type { ConnectorView } from '../../../../../../../shared/connectors';
import { ConnectorStatusBadge } from './ConnectorStatusBadge';

function formatLastRefreshed(value?: string): string {
	if (!value) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
		new Date(value)
	);
}

function StatCell({
	label,
	value,
}: {
	readonly label: string;
	readonly value: React.ReactNode;
}): React.JSX.Element {
	return (
		<div className="min-w-0 px-3 py-2">
			<div className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
				{label}
			</div>
			<div className="mt-0.5 text-xs font-medium text-foreground">{value}</div>
		</div>
	);
}

export function ConnectorCard({
	connector,
	busy,
	connecting,
	onToggle,
	onRefreshTools,
	onConnect,
	onEdit,
	onRemove,
	onViewDetails,
	setupInstructions = [],
	setupUrl,
}: {
	readonly connector: ConnectorView;
	readonly busy: boolean;
	readonly connecting?: boolean;
	readonly onToggle: () => void;
	readonly onRefreshTools: () => void;
	readonly onConnect: () => void;
	readonly onEdit: () => void;
	readonly onRemove: () => void;
	readonly onViewDetails: () => void;
	readonly setupInstructions?: readonly string[];
	readonly setupUrl?: string;
}): React.JSX.Element {
	return (
		<Card size="sm" className="gap-0 rounded-lg py-0 shadow-none">
			<CardContent className="flex flex-col p-0">

				{/* Header */}
				<Item variant="outline" size="sm" className="border-b border-border/60">
					<ItemMedia variant="icon">
						<Plug className="size-3" strokeWidth={1.8} />
					</ItemMedia>
					<ItemContent>
						<div className="min-w-0">
							<ItemTitle>{connector.name}</ItemTitle>
							<div className="mt-0.5 flex flex-wrap items-center gap-1">
								<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
									{connector.connectorId}
								</Badge>
								<ConnectorStatusBadge status={connector.status} />
							</div>
						</div>
					</ItemContent>
					<ItemActions className="gap-2">
						<label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<Switch
								size="sm"
								checked={connector.enabled}
								disabled={busy}
								onCheckedChange={onToggle}
								aria-label={connector.enabled ? 'Disable connector' : 'Enable connector'}
							/>
						</label>
						<Button variant="outline" size="xs" onClick={onViewDetails}>
							<Wrench className="size-3" />
							Tools
						</Button>
					</ItemActions>
				</Item>

				{/* Stats */}
				<div className="grid divide-x divide-border/60 border-b border-border/60 sm:grid-cols-3">
					<StatCell label="Catalog tools" value={connector.toolsCount} />
					<StatCell label="Allowed tools" value={connector.allowedToolsCount || 'All'} />
					<StatCell label="Last refreshed" value={formatLastRefreshed(connector.lastRefreshedAt)} />
				</div>

				{/* Error */}
				{connector.lastError && (
					<p className="border-b border-border/60 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
						{connector.lastError}
					</p>
				)}

				{/* Setup instructions */}
				{setupInstructions.length > 0 && (
					<div className="grid gap-1.5 border-b border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="font-medium text-foreground">Setup</span>
							{setupUrl && (
								<a
									href={setupUrl}
									target="_blank"
									rel="noreferrer"
									onClick={(event) => handleExternalLinkClick(event, setupUrl)}
									className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
								>
									Open setup
									<ExternalLink className="size-3" />
								</a>
							)}
						</div>
						<ol className="grid list-decimal gap-1 pl-4">
							{setupInstructions.map((instruction) => (
								<li key={instruction}>{instruction}</li>
							))}
						</ol>
					</div>
				)}

				{/* Footer actions */}
				<div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
					<div className="flex flex-wrap items-center gap-1">
						<Badge
							variant={connector.requireApproval === 'never' ? 'secondary' : 'outline'}
							className="h-4 px-1.5 text-[10px]"
						>
							{connector.requireApproval.replaceAll('_', ' ')}
						</Badge>
						{connector.deferLoading && (
							<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
								Deferred
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="xs"
							onClick={onConnect}
							disabled={busy || connector.authKind !== 'google_oauth'}
							title="Connect OAuth"
						>
							<LogIn className="size-3" />
							{connecting ? 'Connecting…' : connector.status === 'configured' ? 'Reconnect' : 'Connect'}
						</Button>
						<Button
							variant="outline"
							size="xs"
							onClick={onRefreshTools}
							disabled={busy}
							title="Refresh tools"
						>
							<RefreshCw className="size-3" />
							Refresh
						</Button>
						<Button variant="ghost" size="icon-xs" onClick={onEdit} disabled={busy} title="Edit">
							<Edit3 className="size-3" />
						</Button>
						<Button variant="ghost" size="icon-xs" onClick={onRemove} disabled={busy} title="Remove">
							<Trash2 className="size-3" />
						</Button>
					</div>
				</div>

			</CardContent>
		</Card>
	);
}
