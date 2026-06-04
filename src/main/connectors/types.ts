export type ConnectorServiceId = string;
export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never';
export type ConnectorAuthKind =
	| 'manual_oauth_access_token'
	| 'oauth'
	| 'mcp_env'
	| 'api_key'
	| 'none';

export type ConnectorConfig = {
	id: string;
	name: string;
	connectorId: ConnectorServiceId;
	serverLabel: string;
	serverDescription?: string;
	serverUrl?: string;
	enabled: boolean;
	authorization: string;
	oauth?: {
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
		token?: {
			accessToken: string;
			refreshToken?: string;
			tokenType?: string;
			scope?: string;
			expiresAt?: string;
		};
		connectedAt?: string;
	};
	requireApproval: ConnectorApprovalMode;
	deferLoading: boolean;
	lastRefreshedAt?: string;
	createdAt: string;
	updatedAt: string;
	lastError?: string;
};

export type ConnectorSummary = {
	id: string;
	name: string;
	connectorId: ConnectorServiceId;
	authKind: ConnectorAuthKind;
	serverLabel: string;
	serverUrl?: string;
	enabled: boolean;
	status: ConnectorStatus;
	requireApproval: ConnectorApprovalMode;
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

export type ConnectorsServiceOptions = {
	env?: NodeJS.ProcessEnv;
};
