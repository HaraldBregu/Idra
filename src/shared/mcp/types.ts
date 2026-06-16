export interface McpStdioConfig {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	enabled?: boolean;
}

export interface McpAuth {
	token: string;
}

export interface McpHttpConfig {
	type: 'http';
	url: string;
	auth?: McpAuth;
	enabled?: boolean;
}

export interface McpSseConfig {
	type: 'sse';
	url: string;
	auth?: McpAuth;
	enabled?: boolean;
}

export type McpServerConfig = McpStdioConfig | McpHttpConfig | McpSseConfig;

export interface McpNamedEntry {
	name: string;
	config: McpServerConfig;
}

export type McpServerRecord = Record<string, McpServerConfig>;

export type McpServerStatus = 'connecting' | 'connected' | 'error' | 'disconnected';

export interface McpServerInfo {
	serverName: string;
	status: McpServerStatus;
	errorMessage?: string;
	toolNames: string[];
}
