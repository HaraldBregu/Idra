export const OPENAI_CONNECTOR_CATALOG = [
	{
		id: 'connector_dropbox',
		name: 'Dropbox',
		description: 'Search and fetch files from Dropbox.',
		tools: ['search', 'fetch', 'search_files', 'fetch_file', 'list_recent_files', 'get_profile'],
		scopes: ['files.metadata.read', 'files.content.read', 'account_info.read'],
		setupUrl: 'https://www.dropbox.com/developers/apps',
		setupInstructions: [
			'Go to the Dropbox App Console and create or open an app.',
			'Enable the listed file and account scopes for the app.',
			'Complete OAuth for your account and paste the resulting access token here.',
		],
	},
	{
		id: 'connector_gmail',
		name: 'Gmail',
		description: 'Search, read, draft, send, and manage Gmail messages.',
		tools: [
			'get_profile',
			'search_emails',
			'search_email_ids',
			'get_recent_emails',
			'read_email',
			'batch_read_email',
			'create_draft',
			'send_email',
			'trash_email',
		],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/gmail.readonly',
			'https://www.googleapis.com/auth/gmail.compose',
			'https://www.googleapis.com/auth/gmail.send',
			'https://www.googleapis.com/auth/gmail.modify',
		],
		authKind: 'google_oauth',
		redirectUri: 'http://127.0.0.1:42818/oauth/google/callback',
		setupUrl: 'https://console.cloud.google.com/apis/credentials',
		setupInstructions: [
			'Go to Google Cloud Console, enable the Gmail API, and configure the OAuth consent screen.',
			'Create an OAuth Web application client in APIs & Services > Credentials.',
			'Add http://127.0.0.1:42818/oauth/google/callback as an authorized redirect URI.',
			'Paste the client ID and secret here, save, then use Connect to finish Google consent.',
		],
	},
	{
		id: 'connector_googlecalendar',
		name: 'Google Calendar',
		description: 'Search, read, create, update, and delete Google Calendar events.',
		tools: [
			'get_profile',
			'list_calendars',
			'search',
			'fetch',
			'search_events',
			'read_event',
			'create_event',
			'update_event',
			'delete_event',
		],
		scopes: [
			'https://www.googleapis.com/auth/userinfo.email',
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/calendar.readonly',
			'https://www.googleapis.com/auth/calendar.events.readonly',
			'https://www.googleapis.com/auth/calendar.events',
		],
		authKind: 'google_oauth',
		redirectUri: 'http://127.0.0.1:42818/oauth/google/callback',
		setupUrl: 'https://console.cloud.google.com/apis/credentials',
		setupInstructions: [
			'Go to Google Cloud Console, enable the Google Calendar API, and configure the OAuth consent screen.',
			'Create an OAuth Web application client in APIs & Services > Credentials.',
			'Add http://127.0.0.1:42818/oauth/google/callback as an authorized redirect URI.',
			'Paste the client ID and secret here, save, then use Connect to finish Google consent.',
		],
	},
	{
		id: 'connector_googledrive',
		name: 'Google Drive',
		description: 'Search, list, and fetch Google Drive files.',
		tools: ['get_profile', 'list_drives', 'search', 'recent_documents', 'fetch'],
		scopes: ['userinfo.email', 'userinfo.profile', 'drive.readonly'],
		setupUrl: 'https://console.cloud.google.com/apis/credentials',
		setupInstructions: [
			'Go to Google Cloud Console and enable the Google Drive API.',
			'Create or reuse an OAuth client with the listed Drive read scopes.',
			'Complete OAuth for your Google account and paste the resulting access token here.',
		],
	},
	{
		id: 'connector_microsoftteams',
		name: 'Microsoft Teams',
		description: 'Search Teams chats and channel messages.',
		tools: ['search', 'fetch', 'get_chat_members', 'get_profile'],
		scopes: ['Chat.Read', 'ChannelMessage.Read.All', 'User.Read'],
		setupUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
		setupInstructions: [
			'Go to Microsoft Entra admin center > App registrations.',
			'Create or open an app registration and grant the listed Microsoft Graph permissions.',
			'Complete OAuth for the tenant/user and paste the resulting access token here.',
		],
	},
	{
		id: 'connector_outlookcalendar',
		name: 'Outlook Calendar',
		description: 'Search and read Outlook Calendar events.',
		tools: ['search_events', 'fetch_event', 'fetch_events_batch', 'list_events', 'get_profile'],
		scopes: ['Calendars.Read', 'User.Read'],
		setupUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
		setupInstructions: [
			'Go to Microsoft Entra admin center > App registrations.',
			'Create or open an app registration and grant the listed Microsoft Graph calendar scopes.',
			'Complete OAuth for the account and paste the resulting access token here.',
		],
	},
	{
		id: 'connector_outlookemail',
		name: 'Outlook Email',
		description: 'Search and read Outlook email messages.',
		tools: [
			'get_profile',
			'list_messages',
			'search_messages',
			'get_recent_emails',
			'fetch_message',
			'fetch_messages_batch',
		],
		scopes: ['User.Read', 'Mail.Read'],
		setupUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
		setupInstructions: [
			'Go to Microsoft Entra admin center > App registrations.',
			'Create or open an app registration and grant the listed Microsoft Graph mail scopes.',
			'Complete OAuth for the mailbox account and paste the resulting access token here.',
		],
	},
	{
		id: 'connector_sharepoint',
		name: 'SharePoint',
		description: 'Search and fetch SharePoint and OneDrive documents.',
		tools: ['get_site', 'search', 'list_recent_documents', 'fetch', 'get_profile'],
		scopes: ['Sites.Read.All', 'Files.Read.All', 'User.Read'],
		setupUrl: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
		setupInstructions: [
			'Go to Microsoft Entra admin center > App registrations.',
			'Create or open an app registration and grant the listed Microsoft Graph files and sites scopes.',
			'Complete OAuth for the account and paste the resulting access token here.',
		],
	},
] as const;

export type OpenAiConnectorId = (typeof OPENAI_CONNECTOR_CATALOG)[number]['id'];
export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never' | 'never_for_allowed_tools';
export type ConnectorAuthKind = 'manual_oauth_access_token' | 'google_oauth';

export interface GoogleOAuthCredential {
	provider: 'google';
	clientId: string;
	clientSecret?: string;
	redirectUri: string;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	tokenType?: string;
	scope?: string;
	email?: string;
	connectedAt?: string;
}

export interface ConnectorTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	requiresApproval: boolean;
}

export interface ConnectorConfig {
	id: string;
	name: string;
	connectorId: OpenAiConnectorId;
	serverLabel: string;
	serverDescription?: string;
	enabled: boolean;
	authorization: string;
	oauth?: GoogleOAuthCredential;
	requireApproval: ConnectorApprovalMode;
	allowedTools: string[];
	deferLoading: boolean;
	tools: ConnectorTool[];
	lastRefreshedAt?: string;
	createdAt: string;
	updatedAt: string;
	lastError?: string;
}

export interface ConnectorView {
	id: string;
	name: string;
	connectorId: OpenAiConnectorId;
	authKind: ConnectorAuthKind;
	serverLabel: string;
	enabled: boolean;
	status: ConnectorStatus;
	requireApproval: ConnectorApprovalMode;
	allowedToolsCount: number;
	toolsCount: number;
	deferLoading: boolean;
	lastRefreshedAt?: string;
	lastError?: string;
	connectedAccount?: string;
}

export interface ConnectorInput {
	name: string;
	connectorId: OpenAiConnectorId;
	serverLabel?: string;
	serverDescription?: string;
	authorization?: string;
	oauthClientId?: string;
	oauthClientSecret?: string;
	requireApproval?: ConnectorApprovalMode;
	allowedTools?: string[];
	deferLoading?: boolean;
	enabled?: boolean;
}

export type ConnectorUpdateInput = Partial<ConnectorInput>;

export interface ConnectorTestResult {
	status: ConnectorStatus;
	message?: string;
}

export interface ConnectorOAuthConnectResult {
	status: ConnectorStatus;
	message?: string;
	connectedAccount?: string;
}

export interface ConnectorCallToolOptions {
	timeoutMs?: number;
	retries?: number;
}

export function getConnectorCatalogItem(id: OpenAiConnectorId) {
	return OPENAI_CONNECTOR_CATALOG.find((connector) => connector.id === id);
}

export function isOpenAiConnectorId(value: string): value is OpenAiConnectorId {
	return OPENAI_CONNECTOR_CATALOG.some((connector) => connector.id === value);
}
