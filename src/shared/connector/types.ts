export type DirectConnectorCatalogId = string;
export type ConnectorServiceId = string;

export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never' | 'never_for_allowed_tools';
export type OpenAiConnectorRequireApproval =
	| 'always'
	| 'never'
	| { never: { tool_names: string[] } };
export type ConnectorAuthKind =
	| 'manual_oauth_access_token'
	| 'oauth'
	| 'mcp_env'
	| 'api_key'
	| 'none';
export type ConnectorToolPermission = 'always-allow' | 'needs-approval' | 'blocked';

export type ConnectorOAuthTokenSet = {
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	scope?: string;
	expiresAt?: string;
};

export type ConnectorOAuthCredential = {
	service: string;
	serviceId?: string;
	authorizationUrl?: string;
	clientId?: string;
	clientSecret?: string;
	redirectUri: string;
	scopes?: readonly string[];
	state?: string;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	tokenType?: string;
	scope?: string;
	email?: string;
	accountEmail?: string;
	token?: ConnectorOAuthTokenSet;
	connectedAt?: string;
};

export type ConnectorTool = {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	permission: ConnectorToolPermission;
	requiresApproval: boolean;
};

export type ConnectorConfig = {
	id: string;
	name: string;
	connectorId: ConnectorServiceId;
	serverLabel: string;
	serverDescription?: string;
	serverUrl?: string;
	enabled: boolean;
	authorization: string;
	oauth?: ConnectorOAuthCredential;
	requireApproval: ConnectorApprovalMode;
	allowedTools: string[];
	deferLoading: boolean;
	tools: ConnectorTool[];
	lastRefreshedAt?: string;
	createdAt: string;
	updatedAt: string;
	lastError?: string;
};

export type ConnectorStoreEntry = {
	type: 'mcp';
	server_label: string;
	server_url: string;
	authorization?: string;
	require_approval?: 'never';
	allowed_tools?: string[];
};

export type ConnectorStore = Record<string, ConnectorStoreEntry>;

export type Connector = ConnectorConfig;

export type ConnectorView = {
	id: string;
	name: string;
	connectorId: ConnectorServiceId;
	authKind: ConnectorAuthKind;
	serverLabel: string;
	serverUrl?: string;
	enabled: boolean;
	status: ConnectorStatus;
	requireApproval: ConnectorApprovalMode;
	allowedToolsCount: number;
	toolsCount: number;
	deferLoading: boolean;
	lastRefreshedAt?: string;
	lastError?: string;
	connectedAccount?: string;
};

export type ConnectorInput = {
	name: string;
	connectorId: ConnectorServiceId;
	serverLabel?: string;
	serverDescription?: string;
	serverUrl?: string;
	authorization?: string;
	requireApproval?: ConnectorApprovalMode;
	allowedTools?: string[];
	deferLoading?: boolean;
	enabled?: boolean;
};

export type ConnectorOAuthConnectConfig = {
	service: string;
	serviceId?: string;
	clientIdEnv: string;
	clientSecretEnv?: string;
	authorizationUrl: string;
	tokenUrl: string;
	userInfoUrl?: string;
	scopes: readonly string[];
	accessType?: string;
	prompt?: string;
};

export type ConnectorConnectInput = ConnectorInput & {
	oauth: ConnectorOAuthConnectConfig;
};

export type ConnectorTestResult = {
	status: ConnectorStatus;
	message?: string;
};

export type ConnectorCallToolOptions = {
	timeoutMs?: number;
	retries?: number;
};

export type OpenAiMcpConnectorToolSpec = {
	type: 'mcp';
	server_label: string;
	connector_id?: string;
	server_url?: string;
	authorization?: string;
	require_approval: OpenAiConnectorRequireApproval;
	allowed_tools?: string[];
	defer_loading?: boolean;
	server_description?: string;
};
