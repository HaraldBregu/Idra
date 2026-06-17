import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import gmailIconLight from '@resources/icons/brands/gmail/gmail_light.png';
import gmailIconDark from '@resources/icons/brands/gmail/gmail_dark.png';
import calendarIconLight from '@resources/icons/brands/google_calendar/google_calendar_light.png';
import calendarIconDark from '@resources/icons/brands/google_calendar/google_calendar_dark.png';
import { GMAIL_CONNECTOR, CALENDAR_CONNECTOR } from '@shared/connector';
import { SettingsNotice, SettingsPageHeader, SettingsPageShell } from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { useConnectors } from './hooks/useConnectors';
import type { SettingsConnectorCatalogEntry } from './catalog';

const GMAIL: SettingsConnectorCatalogEntry = { ...GMAIL_CONNECTOR, directConnectorId: GMAIL_CONNECTOR.id };
const GMAIL_ICON = { light: gmailIconLight, dark: gmailIconDark };

const CALENDAR: SettingsConnectorCatalogEntry = { ...CALENDAR_CONNECTOR, directConnectorId: CALENDAR_CONNECTOR.id };
const CALENDAR_ICON = { light: calendarIconLight, dark: calendarIconDark };

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
				token: authorization.accessToken,
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
				<ConnectorCard
					catalogEntry={GMAIL}
					icon={GMAIL_ICON}
					connecting={connectingId === GMAIL.connectorId}
					connector={connectors[GMAIL.directConnectorId] ? { id: GMAIL.directConnectorId, entry: connectors[GMAIL.directConnectorId] } : undefined}
					onConnect={() => connect(GMAIL)}
					onViewDetails={connectors[GMAIL.directConnectorId] ? () => openConnectorDetails(GMAIL.directConnectorId) : undefined}
				/>

				<ConnectorCard
					catalogEntry={CALENDAR}
					icon={CALENDAR_ICON}
					connecting={connectingId === CALENDAR.connectorId}
					connector={connectors[CALENDAR.directConnectorId] ? { id: CALENDAR.directConnectorId, entry: connectors[CALENDAR.directConnectorId] } : undefined}
					onConnect={() => connect(CALENDAR)}
					onViewDetails={connectors[CALENDAR.directConnectorId] ? () => openConnectorDetails(CALENDAR.directConnectorId) : undefined}
				/>
			</div>
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
