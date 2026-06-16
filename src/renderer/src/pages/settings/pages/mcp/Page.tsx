import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Box, ChevronRight, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { McpServerInfo } from '../../../../../../shared/mcp/types';
import type { ConnectorData, ConnectorSettingsRecord } from '../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

type ConnectorEntry = ConnectorData;

function transportLabel(data: ConnectorEntry): string {
	return data.type.toUpperCase();
}

function StatusBadge({
	data,
	info,
}: {
	data: ConnectorEntry;
	info: McpServerInfo | undefined;
}): React.JSX.Element {
	if (data.enabled === false) {
		return <Badge variant="outline" className="text-[10px]">Disabled</Badge>;
	}
	if (!info) {
		return <Badge variant="secondary" className="text-[10px]">Not connected</Badge>;
	}
	if (info.status === 'connected') {
		return <Badge className="bg-emerald-500/15 text-emerald-600 border-transparent text-[10px]">Connected</Badge>;
	}
	if (info.status === 'error') {
		return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
	}
	return <Badge variant="secondary" className="text-[10px]">Disconnected</Badge>;
}

const McpPage: React.FC = () => {
	const navigate = useNavigate();
	const [servers, setServers] = useState<ConnectorSettingsRecord>({});
	const [statusMap, setStatusMap] = useState<Map<string, McpServerInfo>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [reconnecting, setReconnecting] = useState<string | null>(null);

	const load = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const [configs, statuses] = await Promise.all([
				window.connectors.list(),
				window.connectors.status(),
			]);
			setServers(configs);
			setStatusMap(new Map(statuses.map((s) => [s.serverName, s])));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const reconnect = useCallback(async (name: string, e: React.MouseEvent): Promise<void> => {
		e.stopPropagation();
		setReconnecting(name);
		setError(null);
		try {
			await window.connectors.reconnect(name);
			const statuses = await window.connectors.status();
			setStatusMap(new Map(statuses.map((s) => [s.serverName, s])));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setReconnecting(null);
		}
	}, []);

	const entries = Object.entries(servers);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="MCP Servers"
				description="Configure Model Context Protocol servers to extend the agent with external tools."
				action={
					<div className="flex items-center gap-2">
						<Button variant="outline" size="xs" onClick={load} disabled={loading}>
							<RefreshCw className="size-3" />
							Refresh
						</Button>
						<Button size="xs" onClick={() => navigate('/settings/mcp/server/new')}>
							<Plus className="size-3" />
							Add Server
						</Button>
					</div>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Servers">
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : entries.length === 0 ? (
						<SettingsEmptyState
							icon={Box}
							title="No MCP servers"
							description="Add a server to extend the agent with external tools via the Model Context Protocol."
						/>
					) : (
						entries.map(([name, data]) => {
							const info = statusMap.get(name);
							const toolCount = info?.toolNames.length ?? 0;
							const isReconnecting = reconnecting === name;

							return (
								<div key={name} className="border-b border-border/60 last:border-b-0">
									<Item
										role="button"
										tabIndex={0}
										variant="outline"
										size="md"
										className="cursor-pointer border-0 hover:bg-muted/40"
										onClick={() => navigate(`/settings/mcp/server/${encodeURIComponent(name)}`)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												navigate(`/settings/mcp/server/${encodeURIComponent(name)}`);
											}
										}}
									>
										<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
											<ItemTitle className="max-w-full truncate">{name}</ItemTitle>
											<div className="flex flex-wrap items-center gap-1.5">
												<Badge variant="outline" className="text-[10px] font-mono">
													{transportLabel(data)}
												</Badge>
												<StatusBadge data={data} info={info} />
												{info?.status === 'connected' && toolCount > 0 && (
													<span className="text-[11px] text-muted-foreground">
														{toolCount} {toolCount === 1 ? 'tool' : 'tools'}
													</span>
												)}
											</div>
										</ItemContent>
										<ItemActions className="ml-auto flex-none items-center justify-end gap-2">
											<Button
												variant="outline"
												size="xs"
												disabled={isReconnecting}
												onClick={(e) => void reconnect(name, e)}
												className="shrink-0"
											>
												<RotateCcw className={`size-3 ${isReconnecting ? 'animate-spin' : ''}`} />
												{isReconnecting ? 'Connecting…' : 'Reconnect'}
											</Button>
											<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
										</ItemActions>
									</Item>

									{info?.status === 'error' && info.errorMessage && (
										<div className="border-t border-border/40 bg-destructive/5 px-4 py-2">
											<p className="text-[11px] text-destructive">
												{info.errorMessage}
											</p>
										</div>
									)}

									{info?.status === 'connected' && toolCount > 0 && (
										<div className="border-t border-border/40 bg-muted/20 px-4 py-1.5">
											<p className="text-[11px] text-muted-foreground">
												{info.toolNames.join(' · ')}
											</p>
										</div>
									)}
								</div>
							);
						})
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default McpPage;
