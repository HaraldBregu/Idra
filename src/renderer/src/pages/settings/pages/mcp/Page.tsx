import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Box, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import type { McpServerConfig, McpServerInfo } from '../../../../../../shared/mcp/types';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

function statusBadge(config: McpServerConfig, info: McpServerInfo | undefined): React.JSX.Element {
	if (!config.enabled) {
		return <Badge variant="outline" className="text-[10px]">Disabled</Badge>;
	}
	if (!info) {
		return <Badge variant="secondary" className="text-[10px]">Disconnected</Badge>;
	}
	if (info.status === 'connected') {
		return (
			<Badge className="bg-emerald-500/15 text-emerald-600 border-transparent text-[10px]">
				Connected
			</Badge>
		);
	}
	if (info.status === 'error') {
		return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
	}
	return <Badge variant="secondary" className="text-[10px]">Disconnected</Badge>;
}

function transportLabel(config: McpServerConfig): string {
	return config.transport.type.toUpperCase();
}

const McpPage: React.FC = () => {
	const navigate = useNavigate();
	const [servers, setServers] = useState<McpServerConfig[]>([]);
	const [statusMap, setStatusMap] = useState<Map<string, McpServerInfo>>(new Map());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			const [configs, statuses] = await Promise.all([
				window.mcp.listServers(),
				window.mcp.status(),
			]);
			setServers(configs);
			setStatusMap(new Map(statuses.map((s) => [s.serverId, s])));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

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
					) : servers.length === 0 ? (
						<SettingsEmptyState
							icon={Box}
							title="No MCP servers"
							description="Add a server to extend the agent with external tools via the Model Context Protocol."
						/>
					) : (
						servers.map((server) => {
							const info = statusMap.get(server.id);
							const toolCount = info?.toolNames.length ?? 0;
							return (
								<Item
									key={server.id}
									role="button"
									tabIndex={0}
									variant="outline"
									size="md"
									className="cursor-pointer border-b border-border/60 hover:bg-muted/40 last:border-b-0"
									onClick={() => navigate(`/settings/mcp/server/${encodeURIComponent(server.id)}`)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											navigate(`/settings/mcp/server/${encodeURIComponent(server.id)}`);
										}
									}}
								>
									<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
										<ItemTitle className="max-w-full truncate">{server.label}</ItemTitle>
										<div className="flex items-center gap-1.5">
											<Badge variant="outline" className="text-[10px] font-mono">
												{transportLabel(server)}
											</Badge>
											{statusBadge(server, info)}
											{info && toolCount > 0 && (
												<span className="text-[11px] text-muted-foreground">
													{toolCount} {toolCount === 1 ? 'tool' : 'tools'}
												</span>
											)}
										</div>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end">
										<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
									</ItemActions>
								</Item>
							);
						})
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default McpPage;
