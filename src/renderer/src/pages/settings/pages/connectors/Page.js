import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const GMAIL = GMAIL_CONNECTOR;
const GMAIL_ICON = { light: gmailIconLight, dark: gmailIconDark };
const CALENDAR = CALENDAR_CONNECTOR;
const CALENDAR_ICON = { light: calendarIconLight, dark: calendarIconDark };
const ConnectorsPage = () => {
    const navigate = useNavigate();
    const { connectors, error, load, setError } = useConnectors();
    const [connectingId, setConnectingId] = useState(null);
    const openConnectorDetails = (id) => {
        navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
    };
    const connect = async (entry) => {
        const connector = connectors[entry.id];
        if (connector && connector.enabled !== false && !connector.last_error) {
            openConnectorDetails(entry.id);
            return;
        }
        if (!entry.oauth)
            return;
        setConnectingId(entry.connectorId);
        setError(null);
        try {
            const authorization = await window.connectors.authorizeOAuth(entry.oauth);
            const tokenExpiresAt = authorization.expiresIn
                ? new Date(Date.now() + authorization.expiresIn * 1000).toISOString()
                : undefined;
            await window.connectors.upsert({
                id: entry.id,
                name: entry.name,
                token: authorization.accessToken,
                refreshToken: authorization.refreshToken,
                tokenExpiresAt,
                requireApproval: entry.requireApproval,
                deferLoading: entry.deferLoading,
                enabled: entry.enabled,
            });
            await load();
            openConnectorDetails(entry.id);
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : String(caught));
        }
        finally {
            setConnectingId(null);
        }
    };
    return (_jsxs(SettingsPageShell, { children: [_jsx(SettingsPageHeader, { title: "Connectors", description: "Connect external services." }), error && (_jsx(SettingsNotice, { variant: "destructive", icon: AlertTriangle, children: error })), _jsxs("div", { className: "grid gap-2", children: [_jsx(ConnectorCard, { catalogEntry: GMAIL, icon: GMAIL_ICON, connecting: connectingId === GMAIL.connectorId, connector: connectors[GMAIL.id] ? { id: GMAIL.id, entry: connectors[GMAIL.id] } : undefined, onConnect: () => connect(GMAIL), onViewDetails: connectors[GMAIL.id] ? () => openConnectorDetails(GMAIL.id) : undefined }), _jsx(ConnectorCard, { catalogEntry: CALENDAR, icon: CALENDAR_ICON, connecting: connectingId === CALENDAR.connectorId, connector: connectors[CALENDAR.id] ? { id: CALENDAR.id, entry: connectors[CALENDAR.id] } : undefined, onConnect: () => connect(CALENDAR), onViewDetails: connectors[CALENDAR.id] ? () => openConnectorDetails(CALENDAR.id) : undefined })] })] }));
};
export default ConnectorsPage;
