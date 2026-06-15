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
	readonly serverLabel: string;
	readonly serverDescription?: string;
	readonly serverUrl: string;
	readonly description: string;
	readonly iconId?: string;
	readonly requireApproval?: ConnectorApprovalPolicy;
	readonly deferLoading?: boolean;
	readonly enabled?: boolean;
	readonly oauth: ConnectorOAuthDefaults;
}

export interface ConnectorData {
	readonly type: 'mcp';
	readonly connector_id?: string;
	readonly server_label: string;
	readonly server_url: string;
	readonly server_description?: string;
	readonly authorization?: string;
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
	readonly connectorId?: string;
	readonly serverLabel?: string;
	readonly serverDescription?: string;
	readonly serverUrl?: string;
	readonly authorization?: string;
	readonly requireApproval?: ConnectorApprovalPolicy;
	readonly deferLoading?: boolean;
	readonly enabled?: boolean;
	readonly createdAt?: string;
}
