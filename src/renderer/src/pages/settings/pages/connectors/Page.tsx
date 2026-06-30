import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import type { McpData, McpHttpData } from '@shared/mcp';
import { Button } from '@/components/ui/button';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { OAuthConnectorDialog } from './components/OAuthConnectorDialog';
import { useConnectors } from './hooks/useConnectors';

type ConnectorEntry = [id: string, entry: McpData];

function describeConnector(entry: McpData): string {
	return entry.type === 'stdio' ? entry.command : entry.url;
}

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const { connectors, error, load } = useConnectors();

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const addConnector = async (id: string, entry: McpHttpData): Promise<void> => {
		await window.agent.mcpSave({ ...connectors, [id]: entry });
		await load();
	};

	const entries = Object.entries(connectors) as ConnectorEntry[];
	const remoteEntries = entries.filter(([, entry]) => entry.type === 'http');
	const localEntries = entries.filter(([, entry]) => entry.type === 'stdio');

	const renderList = (list: ConnectorEntry[], emptyLabel: string) =>
		list.length === 0 ? (
			<div className="px-0.5 text-[13px] text-muted-foreground">{emptyLabel}</div>
		) : (
			<div className="grid gap-2">
				{list.map(([id, entry]) => (
					<ConnectorCard
						key={id}
						catalogEntry={{ id, name: entry.name ?? id, description: describeConnector(entry) }}
						connector={{ id, entry }}
						onConnect={() => openConnectorDetails(id)}
						onViewDetails={() => openConnectorDetails(id)}
					/>
				))}
			</div>
		);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="Connectors"
				description="Connected MCP servers."
				action={
					<OAuthConnectorDialog
						trigger={
							<Button variant="outline" size="sm">
								<Plus className="size-3.5" />
								Add OAuth connector
							</Button>
						}
						onSubmit={addConnector}
					/>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Connectors" description="Remote MCP servers.">
				{renderList(remoteEntries, 'No connectors configured.')}
			</SettingsSection>

			<SettingsSection title="Local MCP servers" description="MCP servers running locally via a command.">
				{renderList(localEntries, 'No local MCP servers configured.')}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
