import type {
	ConnectorConnectInput,
	DirectConnectorCatalogId,
} from '../../../../../../shared/connector';
import {
	GMAIL_CONNECTOR_ID,
	GMAIL_MCP_SERVER_URL,
	GMAIL_TOOLS_WITHOUT_APPROVAL,
} from '../../../../../../shared/connector';

export type SettingsConnectorCatalogEntry = ConnectorConnectInput & {
	readonly directConnectorId: DirectConnectorCatalogId;
	readonly description: string;
};

export const SETTINGS_CONNECTOR_CATALOG: readonly SettingsConnectorCatalogEntry[] = [
	{
		connectorId: GMAIL_CONNECTOR_ID,
		directConnectorId: 'gmail',
		name: 'Gmail',
		serverLabel: 'gmail',
		serverDescription: 'Read, search, draft, and send Gmail messages through Google hosted MCP.',
		serverUrl: GMAIL_MCP_SERVER_URL,
		description: 'Read, search, draft, and send Gmail messages.',
		requireApproval: 'never_for_allowed_tools',
		allowedTools: [...GMAIL_TOOLS_WITHOUT_APPROVAL],
		deferLoading: false,
		enabled: true,
		oauth: {
			service: 'google',
			serviceId: 'gmail',
			clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
			clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
			authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
			tokenUrl: 'https://oauth2.googleapis.com/token',
			userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
			scopes: [
				'openid',
				'email',
				'https://www.googleapis.com/auth/gmail.readonly',
				'https://www.googleapis.com/auth/gmail.compose',
			],
			accessType: 'offline',
			prompt: 'consent',
		},
	},
];
