export const MCP_APPROVAL_POLICIES = ['always', 'never'] as const;

export type McpApprovalPolicy = (typeof MCP_APPROVAL_POLICIES)[number];

export interface McpOAuthDefaults {
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

export interface McpOAuthAuthorizationResult {
	readonly accessToken: string;
	readonly refreshToken?: string;
	readonly expiresIn?: number;
}

interface McpBase {
	readonly require_approval?: McpApprovalPolicy;
	readonly defer_loading?: boolean;
	readonly enabled?: boolean;
	readonly created_at?: string;
	readonly updated_at?: string;
	readonly last_error?: string;
}

export interface McpHttpData extends McpBase {
	readonly type: 'http';
	readonly url: string;
	readonly token?: string;
	readonly refresh_token?: string;
	readonly token_expires_at?: string;
	readonly last_refreshed_at?: string;
}

export interface McpStdioData extends McpBase {
	readonly type: 'stdio';
	readonly command: string;
	readonly args?: readonly string[];
	readonly env?: Readonly<Record<string, string>>;
	readonly cwd?: string;
}

export type McpData = McpHttpData | McpStdioData;

export type McpSettings = Record<string, McpData>;
