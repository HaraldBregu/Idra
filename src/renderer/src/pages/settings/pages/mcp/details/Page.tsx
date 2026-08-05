import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Pencil, Plug } from 'lucide-react';
import type { McpData } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { McpStatusBadge } from '../components/McpStatusBadge';
import { McpOAuthButton } from '../components/McpOAuthButton';
import { McpServerDialog } from '../components/McpServerDialog';

type McpServerRecord = Awaited<ReturnType<typeof window.mcp.list>>;
type McpServerEntry = McpServerRecord[string];

function mcpServerStatus(server: McpServerEntry): 'configured' | 'disabled' | 'error' {
	if (server.enabled === false) return 'disabled';
	if (server.last_error) return 'error';
	return 'configured';
}

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function mcpServerRecordEntry(
	record: McpServerRecord,
	preferredId?: string
): { id: string; server: McpServerEntry } | undefined {
	const entry = preferredId ? record[preferredId] : undefined;
	const id = preferredId && entry ? preferredId : (Object.entries(record)[0]?.[0]);
	const server = id ? record[id] : undefined;
	if (!id || !server) return undefined;
	return { id, server };
}

const McpDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const { mcpServerId } = useParams<{ mcpServerId: string }>();
	const [serverRecord, setServerRecord] = useState<McpServerRecord | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		if (!mcpServerId) {
			setLoading(false);
			setError(t('settings.mcp.notFoundDescription'));
			return () => {
				mounted = false;
			};
		}

		setLoading(true);
		setError(null);

		void window.mcp.get(mcpServerId).then(
			(nextServer) => {
				if (!mounted) return;
				setServerRecord(nextServer);
				setError(null);
				setLoading(false);
			},
			(caught) => {
				if (!mounted) return;
				setServerRecord(null);
				setError(caught instanceof Error ? caught.message : String(caught));
				setLoading(false);
			}
		);

		return () => {
			mounted = false;
		};
	}, [mcpServerId, t]);

	const updateMcpServer = async (id: string, entry: McpData): Promise<void> => {
		await window.mcp.upsert(id, entry);
		if (mcpServerId) setServerRecord(await window.mcp.get(mcpServerId));
	};

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.mcp.detailsTitle')} />
				<Card size="sm" className="gap-0! p-3!">
					<Skeleton className="h-5 w-56 max-w-full" />
					<Skeleton className="mt-3 h-16 w-full" />
				</Card>
			</SettingsPageShell>
		);
	}

	const selected = mcpServerRecordEntry(serverRecord ?? {}, mcpServerId);
	if (!selected) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.mcp.detailsTitle')} />
				<Card size="sm" className="gap-0! p-0!">
					<SettingsEmptyState
						icon={Plug}
						title={t('settings.mcp.notFoundTitle')}
						description={error ?? t('settings.mcp.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	const { id, server } = selected;
	const httpServer = server.type === 'http' ? server : undefined;
	const stdioServer = server.type === 'stdio' ? server : undefined;
	const authLabel = httpServer ? (httpServer.token ? 'Access token' : 'OAuth / none') : 'Local process';
	const displayName = server.name ?? id;
	const status = mcpServerStatus(server);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={displayName}
				action={
					<div className="flex flex-wrap items-center gap-1.5">
						<label className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Switch
								checked={server.enabled !== false}
								onCheckedChange={(enabled) =>
									void updateMcpServer(id, {
										...server,
										enabled,
										updated_at: new Date().toISOString(),
									})
								}
							/>
							{server.enabled !== false ? 'Active' : 'Inactive'}
						</label>
						<McpServerDialog
							initial={{ id, entry: server }}
							trigger={
								<Button variant="outline" size="sm">
									<Pencil className="size-3.5" />
									Edit
								</Button>
							}
							onSubmit={updateMcpServer}
						/>
					</div>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Configuration">
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>ID</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{id}</span>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Status</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<McpStatusBadge status={status} />
						</ItemActions>
					</Item>
					{httpServer && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Server URL</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{httpServer.url}</span>
							</ItemActions>
						</Item>
					)}
					{stdioServer && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Command</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{stdioServer.command}</span>
							</ItemActions>
						</Item>
					)}
					{stdioServer && stdioServer.args && stdioServer.args.length > 0 && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Arguments</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground">{stdioServer.args.join(' ')}</span>
							</ItemActions>
						</Item>
					)}
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Auth</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{authLabel}</span>
						</ItemActions>
					</Item>
					{httpServer && (
						<Item variant="outline" size="md" className="border-b border-border/60">
							<ItemContent><ItemTitle>Last refreshed</ItemTitle></ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{formatTimestamp(httpServer.last_refreshed_at)}</span>
							</ItemActions>
						</Item>
					)}
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent><ItemTitle>Updated</ItemTitle></ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground">{formatTimestamp(server.updated_at)}</span>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			{httpServer && !httpServer.token && (
				<SettingsSection title="Authentication" description="Sign in to this server with OAuth.">
					<McpOAuthButton id={id} />
				</SettingsSection>
			)}

			{server.last_error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{server.last_error}
				</SettingsNotice>
			)}
		</SettingsPageShell>
	);
};

export default McpDetailsPage;
