import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
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
	const { connectors, error, load, setError } = useConnectors();
	const [connectingId, setConnectingId] = useState<string | null>(null);
	const connectorByCatalogId = new Map(connectors.map((connector) => [connector.connectorId, connector]));

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const connect = async (entry: SettingsConnectorCatalogEntry): Promise<void> => {
		const connector = connectorByCatalogId.get(entry.connectorId);
		if (connector?.status === 'configured') {
			openConnectorDetails(connector.id);
			return;
		}
		setConnectingId(entry.connectorId);
		setError(null);
		try {
			await window.connectors.connect(entry);
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setConnectingId(null);
		}
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
							connecting={connectingId === entry.connectorId}
							connector={connector}
							onConnect={() => connect(entry)}
							onViewDetails={connector ? () => openConnectorDetails(connector.id) : undefined}
						/>
					);
				})}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
