import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { McpData } from '@shared/mcp';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { useConnectors } from './hooks/useConnectors';

function describeConnector(entry: McpData): string {
	return entry.type === 'stdio' ? entry.command : entry.url;
}

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const { connectors, error } = useConnectors();

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const entries = Object.entries(connectors);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title="MCP Servers" description="Connected MCP servers." />

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{entries.length === 0 ? (
				<div className="text-[13px] text-muted-foreground">No MCP servers configured.</div>
			) : (
				<div className="grid gap-2">
					{entries.map(([id, entry]) => (
						<ConnectorCard
							key={id}
							catalogEntry={{
								id,
								connectorId: id,
								name: id,
								description: describeConnector(entry),
								iconId: id,
							}}
							connector={{ id, entry }}
							onConnect={() => openConnectorDetails(id)}
							onViewDetails={() => openConnectorDetails(id)}
						/>
					))}
				</div>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
