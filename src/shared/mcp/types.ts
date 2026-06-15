export interface McpStdioConfig {
	type: 'stdio';
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
}

export interface McpSseConfig {
	type: 'sse';
	url: string;
	headers?: Record<string, string>;
}

export interface McpHttpConfig {
	type: 'http';
	url: string;
	headers?: Record<string, string>;
}

export type McpTransportConfig = McpStdioConfig | McpSseConfig | McpHttpConfig;

export interface McpServerOAuth {
	tokenUrl: string;
	clientIdEnv: string;
	clientSecretEnv?: string;
	refreshToken: string;
	tokenExpiresAt?: string;
}

export interface McpServerConfig {
	id: string;
	label: string;
	transport: McpTransportConfig;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
	oauth?: McpServerOAuth;
}

export type McpServerRecord = Record<string, McpServerConfig>;

export type McpServerStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

export interface McpServerInfo {
	serverId: string;
	label: string;
	status: McpServerStatus;
	errorMessage?: string;
	toolNames: string[];
}
