import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plug } from 'lucide-react';
import {
	SettingsEmptyState,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorCatalogItem } from './components/ConnectorCatalogItem';
import { useConnectors } from './hooks/useConnectors';

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const {
		catalog, connectors, busyId,
		error,
		statusMessage,
		toggleConnector,
	} = useConnectors();
	const configuredConnectorIds = new Set(connectors.map((connector) => connector.connectorId));

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const configureCatalogConnector = (id: string): void => {
		navigate(`/settings/connectors/configure/${encodeURIComponent(id)}`);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="Connectors"
				description="Configure MCP-backed connectors for agent tool use."
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{statusMessage && <SettingsNotice variant="default">{statusMessage}</SettingsNotice>}

			<div className="grid gap-2">
				{connectors.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Plug}
							title="No connectors configured yet."
							description="Add a connector to make external tools available to agent runs."
						/>
					</SettingsPanel>
				) : (
					connectors.map((connector) => (
						<ConnectorCard
							key={connector.id}
							connector={connector}
							busy={busyId === connector.id}
							onToggle={() => void toggleConnector(connector)}
							onViewDetails={() => openConnectorDetails(connector.id)}
						/>
					))
				)}
				{catalog.map((item) => (
					<ConnectorCatalogItem
						key={item.id}
						item={item}
						onConfigure={() => configureCatalogConnector(item.id)}
						alreadyConfigured={configuredConnectorIds.has(item.id)}
					/>
				))}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
