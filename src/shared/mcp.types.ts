import { MCP_APPROVAL_POLICIES } from './mcp.definitions';

export type McpApprovalPolicy = (typeof MCP_APPROVAL_POLICIES)[number];

interface McpBase {
	readonly name?: string;
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
	readonly client_id?: string;
	readonly client_secret?: string;
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

export type McpOAuthStart = { status: 'authorized' } | { status: 'redirect'; url: string };
