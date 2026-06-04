type ConnectorConnectInput = Parameters<typeof window.connectors.connect>[0];
type DirectConnectorCatalogId = string;

export const GMAIL_READ_TOOLS = [
	'get_profile',
	'search_threads',
	'read_thread',
	'get_thread',
	'search_emails',
	'search_email_ids',
	'get_recent_emails',
	'read_email',
	'batch_read_email',
] as const;

export type SettingsConnectorCatalogEntry = ConnectorConnectInput & {
	readonly directConnectorId: DirectConnectorCatalogId;
	readonly description: string;
};

export const SETTINGS_CONNECTOR_CATALOG: readonly SettingsConnectorCatalogEntry[] = [
	{
		connectorId: 'connector_gmail',
		directConnectorId: 'gmail',
		name: 'Gmail',
		serverLabel: 'gmail',
		serverUrl: 'https://gmailmcp.googleapis.com/mcp/v1',
		serverDescription: 'Read and search Gmail messages through the OpenAI Gmail connector.',
		description: 'Read and search Gmail messages.',
		requireApproval: 'never_for_allowed_tools',
		allowedTools: [...GMAIL_READ_TOOLS],
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
				'profile',
				'https://www.googleapis.com/auth/gmail.modify',
			],
			accessType: 'offline',
			prompt: 'consent',
		},
	},
];
