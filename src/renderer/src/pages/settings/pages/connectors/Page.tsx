import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plug } from 'lucide-react';
import type { ConnectorInput } from '@shared/connector';
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
		connectingId,
		error, setError,
		statusMessage,
		load,
		connectOAuth,
		toggleConnector,
	} = useConnectors();
	const configuredConnectorIds = new Set(connectors.map((connector) => connector.connectorId));

	const addConnector = async (input: ConnectorInput): Promise<void> => {
		setError(null);
		try {
			const alreadyConfigured = configuredConnectorIds.has(input.connectorId);
			if (alreadyConfigured) {
				setError(`Connector ${input.connectorId} is already configured.`);
				return;
			}
			await window.connectors.add(input);
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="Connectors"
				description="Configure OpenAI-maintained connectors for Responses API tool use."
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
							connecting={connectingId === connector.id}
							onConnectOAuth={() => void connectOAuth(connector)}
							onToggle={() => void toggleConnector(connector)}
							onViewDetails={() => openConnectorDetails(connector.id)}
						/>
					))
				)}
				{catalog.length > 0 && catalog.map((item) => (
					<ConnectorCatalogItem
						key={item.id}
						item={item}
						onAdd={addConnector}
						alreadyConfigured={configuredConnectorIds.has(item.id)}
					/>
				))}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
