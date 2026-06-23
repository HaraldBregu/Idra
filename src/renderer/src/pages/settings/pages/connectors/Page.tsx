import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import type { ConnectorData } from '@shared/connector';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorTools } from './components/ConnectorTools';
import { useConnectors } from './hooks/useConnectors';

function describeConnector(entry: ConnectorData): string {
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
			<SettingsPageHeader title="Connectors" description="Connected MCP servers." />

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
						<div key={id} className="flex flex-col gap-2">
							<ConnectorCard
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
							<ConnectorTools id={id} />
						</div>
					))}
				</div>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
