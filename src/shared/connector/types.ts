export const CONNECTOR_APPROVAL_POLICIES = ['always', 'never'] as const;

export type ConnectorApprovalPolicy = (typeof CONNECTOR_APPROVAL_POLICIES)[number];

export interface ConnectorOAuthDefaults {
	readonly service: string;
	readonly serviceId?: string;
	readonly clientIdEnv: string;
	readonly clientSecretEnv?: string;
	readonly authorizationUrl: string;
	readonly tokenUrl: string;
	readonly userInfoUrl?: string;
	readonly scopes: readonly string[];
	readonly accessType?: string;
	readonly prompt?: string;
}

export interface ConnectorOAuthAuthorizationResult {
	readonly accessToken: string;
	readonly refreshToken?: string;
	readonly expiresIn?: number;
}

interface ConnectorBase {
	readonly require_approval?: ConnectorApprovalPolicy;
	readonly defer_loading?: boolean;
	readonly enabled?: boolean;
	readonly created_at?: string;
	readonly updated_at?: string;
	readonly last_error?: string;
}

export interface ConnectorHttpData extends ConnectorBase {
	readonly type: 'http';
	readonly url: string;
	readonly token?: string;
	readonly refresh_token?: string;
	readonly token_expires_at?: string;
	readonly last_refreshed_at?: string;
}

export interface ConnectorSseData extends ConnectorBase {
	readonly type: 'sse';
	readonly url: string;
	readonly token?: string;
}

export interface ConnectorStdioData extends ConnectorBase {
	readonly type: 'stdio';
	readonly command: string;
	readonly args?: readonly string[];
	readonly env?: Readonly<Record<string, string>>;
	readonly cwd?: string;
}

export type ConnectorData = ConnectorHttpData | ConnectorSseData | ConnectorStdioData;

export type ConnectorSettingsRecord = Record<string, ConnectorData>;

export interface ConnectorInput {
	readonly id: string;
	readonly name?: string;
	// Transport type — required when creating a new custom server
	readonly type?: 'http' | 'sse' | 'stdio';
	// Common
	readonly requireApproval?: ConnectorApprovalPolicy;
	readonly deferLoading?: boolean;
	readonly enabled?: boolean;
	readonly createdAt?: string;
	// HTTP / SSE
	readonly url?: string;
	readonly token?: string;
	readonly refreshToken?: string;
	readonly tokenExpiresAt?: string;
	// STDIO
	readonly command?: string;
	readonly args?: readonly string[];
	readonly env?: Readonly<Record<string, string>>;
	readonly cwd?: string;
}
