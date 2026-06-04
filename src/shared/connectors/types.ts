export type ConnectorRecord = Record<string, {
	type: 'mcp';
	server_label: string;
	server_url: string;
	server_description?: string;
	authorization?: string;
	require_approval?: 'always' | 'never';
	defer_loading?: boolean;
	enabled?: boolean;
	last_refreshed_at?: string;
	created_at?: string;
	updated_at?: string;
	last_error?: string;
}>;

export type ConnectorApprovalMode = 'always' | 'never';

export type ConnectorInput = {
	id?: string;
	name: string;
	connectorId: string;
	serverLabel?: string;
	serverDescription?: string;
	serverUrl?: string;
	authorization?: string;
	requireApproval?: ConnectorApprovalMode;
	deferLoading?: boolean;
	enabled?: boolean;
	createdAt?: string;
};

export type OAuthAuthorizeInput = {
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

export type OAuthAuthorizeResult = {
	service: string;
	serviceId?: string;
	authorizationUrl: string;
	redirectUri: string;
	scopes: readonly string[];
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	scope?: string;
	expiresAt?: string;
	accountEmail?: string;
	connectedAt: string;
};
