import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import type { McpData } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { McpServerCard } from './components/McpServerCard';
import { McpServerDialog } from './components/McpServerDialog';
import { useMcpServers } from './hooks/useMcpServers';

type McpServerEntry = [id: string, entry: McpData];

function describeMcpServer(entry: McpData): string {
	return entry.type === 'stdio' ? entry.command : entry.url;
}

const McpPage = () => {
	const navigate = useNavigate();
	const { servers, error, load } = useMcpServers();

	const openMcpServerDetails = (id: string): void => {
		navigate(`/settings/mcp/details/${encodeURIComponent(id)}`);
	};

	const addMcpServer = async (id: string, entry: McpData): Promise<void> => {
		await window.agent.mcpSave({ ...servers, [id]: entry });
		await load();
	};

	const entries = Object.entries(servers) as McpServerEntry[];
	const remoteEntries = entries.filter(([, entry]) => entry.type === 'http');
	const localEntries = entries.filter(([, entry]) => entry.type === 'stdio');

	const renderList = (list: McpServerEntry[], emptyLabel: string) =>
		list.length === 0 ? (
			<div className="px-0.5 text-[13px] text-muted-foreground">{emptyLabel}</div>
		) : (
			<div className="grid gap-2">
				{list.map(([id, entry]) => (
					<McpServerCard
						key={id}
						catalogEntry={{ id, name: entry.name ?? id, description: describeMcpServer(entry) }}
						server={{ id, entry }}
						onConnect={() => openMcpServerDetails(id)}
						onViewDetails={() => openMcpServerDetails(id)}
					/>
				))}
			</div>
		);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="MCP"
				description="Connected MCP servers."
				action={
					<div className="flex gap-2">
						<StdioMcpServerDialog
							trigger={
								<Button variant="outline" size="sm">
									<Plus className="size-3.5" />
									Add local server
								</Button>
							}
							onSubmit={addMcpServer}
						/>
						<OAuthMcpServerDialog
							trigger={
								<Button variant="outline" size="sm">
									<Plus className="size-3.5" />
									Add remote server
								</Button>
							}
							onSubmit={addMcpServer}
						/>
					</div>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Remote MCP servers" description="MCP servers available over HTTP.">
				{renderList(remoteEntries, 'No remote MCP servers configured.')}
			</SettingsSection>

			<SettingsSection title="Local MCP servers" description="MCP servers running locally via a command.">
				{renderList(localEntries, 'No local MCP servers configured.')}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default McpPage;
