import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plug } from 'lucide-react';
import type { OpenAiConnectorId } from '../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorCatalogItem } from './components/ConnectorCatalogItem';
import { useConnectors, type ConnectorCatalog } from './hooks/useConnectors';
function catalogItem(catalog: ConnectorCatalog, connectorId: string): ConnectorCatalog[number] | undefined {
	return catalog.find((c) => c.id === connectorId);
}

const ConnectorsPage: React.FC = () => {
	const navigate = useNavigate();
	const {
		catalog, connectors, busyId,
		connectingId,
		error, setError,
		statusMessage,
		connectOAuth,
		toggleConnector,
	} = useConnectors();

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

			{selected}

			<SettingsSection title="Configured connectors">
				{connectors.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Plug}
							title="No connectors configured yet."
							description="Add a connector to make external tools available to agent runs."
						/>
					</SettingsPanel>
				) : (
					<div className="grid gap-2">
						{connectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
								connecting={connectingId === connector.id}
								onConnectOAuth={() => void connectOAuth(connector)}
								onToggle={() => void toggleConnector(connector)}
								onViewDetails={() => openConnectorDetails(connector.id)}
							/>
						))}
					</div>
				)}
			</SettingsSection>

			{catalog.length > 0 && (
				<SettingsSection title="Available connectors">
					<div className="grid gap-2">
						{catalog.map((item) => (
							<ConnectorCatalogItem
								key={item.id}
								item={item}
							/>
						))}
					</div>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
