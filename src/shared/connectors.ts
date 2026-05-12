export const OPENAI_CONNECTOR_CATALOG = [
	{
		id: 'connector_dropbox',
		name: 'Dropbox',
		description: 'Search and fetch files from Dropbox.',
		tools: ['search', 'fetch', 'search_files', 'fetch_file', 'list_recent_files', 'get_profile'],
		scopes: ['files.metadata.read', 'files.content.read', 'account_info.read'],
	},
	{
		id: 'connector_gmail',
		name: 'Gmail',
		description: 'Search and read Gmail messages.',
		tools: [
			'get_profile',
			'search_emails',
			'search_email_ids',
			'get_recent_emails',
			'read_email',
			'batch_read_email',
		],
		scopes: ['userinfo.email', 'userinfo.profile', 'gmail.modify'],
	},
	{
		id: 'connector_googlecalendar',
		name: 'Google Calendar',
		description: 'Search and read Google Calendar events.',
		tools: ['get_profile', 'search', 'fetch', 'search_events', 'read_event'],
		scopes: ['userinfo.email', 'userinfo.profile', 'calendar.events'],
	},
	{
		id: 'connector_googledrive',
		name: 'Google Drive',
		description: 'Search, list, and fetch Google Drive files.',
		tools: ['get_profile', 'list_drives', 'search', 'recent_documents', 'fetch'],
		scopes: ['userinfo.email', 'userinfo.profile', 'drive.readonly'],
	},
	{
		id: 'connector_microsoftteams',
		name: 'Microsoft Teams',
		description: 'Search Teams chats and channel messages.',
		tools: ['search', 'fetch', 'get_chat_members', 'get_profile'],
		scopes: ['Chat.Read', 'ChannelMessage.Read.All', 'User.Read'],
	},
	{
		id: 'connector_outlookcalendar',
		name: 'Outlook Calendar',
		description: 'Search and read Outlook Calendar events.',
		tools: ['search_events', 'fetch_event', 'fetch_events_batch', 'list_events', 'get_profile'],
		scopes: ['Calendars.Read', 'User.Read'],
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
	},
	{
		id: 'connector_sharepoint',
		name: 'SharePoint',
		description: 'Search and fetch SharePoint and OneDrive documents.',
		tools: ['get_site', 'search', 'list_recent_documents', 'fetch', 'get_profile'],
		scopes: ['Sites.Read.All', 'Files.Read.All', 'User.Read'],
	},
] as const;

export type OpenAiConnectorId = (typeof OPENAI_CONNECTOR_CATALOG)[number]['id'];
export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never' | 'never_for_allowed_tools';

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
	serverLabel: string;
	enabled: boolean;
	status: ConnectorStatus;
	requireApproval: ConnectorApprovalMode;
	allowedToolsCount: number;
	toolsCount: number;
	deferLoading: boolean;
	lastRefreshedAt?: string;
	lastError?: string;
}

export interface ConnectorInput {
	name: string;
	connectorId: OpenAiConnectorId;
	serverLabel?: string;
	serverDescription?: string;
	authorization: string;
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
