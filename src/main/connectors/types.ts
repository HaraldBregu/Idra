export type ConnectorServiceId = string;
export type ConnectorApprovalMode = 'always' | 'never';

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
