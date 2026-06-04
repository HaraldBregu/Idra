import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { openExternalUrl } from '@/lib/external-links';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { SETTINGS_CONNECTOR_CATALOG, type SettingsConnectorCatalogEntry } from './catalog';
import { useConnectors } from './hooks/useConnectors';

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const { connectors, error } = useConnectors();
	const connectorByCatalogId = new Map(connectors.map((connector) => [connector.connectorId, connector]));
	const catalogIds = new Set(SETTINGS_CONNECTOR_CATALOG.map((connector) => connector.connectorId));
	const customConnectors = connectors.filter((connector) => !catalogIds.has(connector.connectorId));

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const connect = (entry: SettingsConnectorCatalogEntry): void => {
		const connector = connectorByCatalogId.get(entry.connectorId);
		if (connector) {
			openConnectorDetails(connector.id);
			return;
		}
		openExternalUrl(entry.setupUrl);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="Connectors"
				description="Connect external services for agent tools."
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			<div className="grid gap-2">
				{SETTINGS_CONNECTOR_CATALOG.map((entry) => {
					const connector = connectorByCatalogId.get(entry.connectorId);
					return (
						<ConnectorCard
							key={entry.connectorId}
							catalogEntry={entry}
							connector={connector}
							onConnect={() => connect(entry)}
							onViewDetails={connector ? () => openConnectorDetails(connector.id) : undefined}
						/>
					);
				})}
				{customConnectors.map((connector) => (
					<ConnectorCard
						key={connector.id}
						catalogEntry={{
							connectorId: connector.connectorId,
							directConnectorId: connector.connectorId,
							name: connector.name,
							description: connector.serverUrl ?? connector.serverLabel,
							setupUrl: connector.serverUrl ?? 'https://platform.openai.com/docs/guides/tools-connectors-mcp',
						}}
						connector={connector}
						onConnect={() => openConnectorDetails(connector.id)}
						onViewDetails={() => openConnectorDetails(connector.id)}
					/>
				))}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
