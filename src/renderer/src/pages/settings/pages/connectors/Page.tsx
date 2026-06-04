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
import { useConnectors } from './hooks/useConnectors';

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const {
		connectors, busyId,
		connectingId,
		error,
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
				description="Configured connector records from connectors.json."
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
							description="Add connector records to connectors.json to make them available to agent runs."
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
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
