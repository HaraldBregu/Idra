import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { SETTINGS_CONNECTOR_CATALOG, type SettingsConnectorCatalogEntry } from './catalog';
import { useConnectors } from './hooks/useConnectors';

const ConnectorsPage = () => {
	const navigate = useNavigate();
	const { connectors, error, load, setError } = useConnectors();
	const [connectingId, setConnectingId] = useState<string | null>(null);

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	const connect = async (entry: SettingsConnectorCatalogEntry): Promise<void> => {
		const connector = connectors[entry.directConnectorId];
		if (connector && connector.enabled !== false && !connector.last_error) {
			openConnectorDetails(entry.directConnectorId);
			return;
		}
		setConnectingId(entry.connectorId);
		setError(null);
		try {
			const authorization = await window.connectors.authorizeOAuth(entry.oauth);
			const tokenExpiresAt = authorization.expiresIn
				? new Date(Date.now() + authorization.expiresIn * 1000).toISOString()
				: undefined;
			await window.connectors.upsert({
				id: entry.directConnectorId,
				name: entry.name,
				connectorId: entry.connectorId,
				serverLabel: entry.serverLabel,
				serverDescription: entry.serverDescription,
				serverUrl: entry.serverUrl,
				authorization: authorization.accessToken,
				refreshToken: authorization.refreshToken,
				tokenExpiresAt,
				requireApproval: entry.requireApproval,
				deferLoading: entry.deferLoading,
				enabled: entry.enabled,
			});
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setConnectingId(null);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title="Connectors" description="Connect external services." />

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			<div className="grid gap-2">
				{SETTINGS_CONNECTOR_CATALOG.map((entry) => {
					const connector = connectors[entry.directConnectorId];
					return (
						<ConnectorCard
							key={entry.connectorId}
							catalogEntry={entry}
							connecting={connectingId === entry.connectorId}
							connector={connector ? { id: entry.directConnectorId, entry: connector } : undefined}
							onConnect={() => connect(entry)}
							onViewDetails={
								connector ? () => openConnectorDetails(entry.directConnectorId) : undefined
							}
						/>
					);
				})}
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
