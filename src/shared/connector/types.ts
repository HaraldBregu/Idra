export const CONNECTOR_IDS = ['gmail', 'calendar'] as const;

export type ConnectorId = (typeof CONNECTOR_IDS)[number];

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

export interface ConnectorDefault {
	readonly id: ConnectorId;
	readonly connectorId: string;
	readonly name: string;
	readonly url: string;
	readonly description: string;
	readonly iconId?: string;
	readonly requireApproval?: ConnectorApprovalPolicy;
	readonly deferLoading?: boolean;
	readonly enabled?: boolean;
	readonly oauth: ConnectorOAuthDefaults;
}

export interface ConnectorData {
	readonly type: 'http';
	readonly url: string;
	readonly token?: string;
	readonly refresh_token?: string;
	readonly token_expires_at?: string;
	readonly require_approval?: ConnectorApprovalPolicy;
	readonly defer_loading?: boolean;
	readonly enabled?: boolean;
	readonly last_refreshed_at?: string;
	readonly created_at?: string;
	readonly updated_at?: string;
	readonly last_error?: string;
}

export type ConnectorSettingsRecord = Record<string, ConnectorData>;

export interface ConnectorInput {
	readonly id?: string;
	readonly name: string;
	readonly token?: string;
	readonly refreshToken?: string;
	readonly tokenExpiresAt?: string;
	readonly requireApproval?: ConnectorApprovalPolicy;
	readonly deferLoading?: boolean;
	readonly enabled?: boolean;
	readonly createdAt?: string;
}
