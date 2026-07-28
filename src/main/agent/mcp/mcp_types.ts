import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type {
	OAuthClientInformationMixed,
	OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { McpSettings } from '../../../shared/mcp_types';

export type McpClient = Client;

export type McpCallResult = {
	content?: unknown;
	isError?: boolean;
};

export type McpListToolsResult = ReturnType<Client['listTools']>;

export type McpCallToolResult = ReturnType<Client['callTool']>;

export type McpOAuthState = {
	clientInformation?: OAuthClientInformationMixed;
	tokens?: OAuthTokens;
	codeVerifier?: string;
};

export type ConnectorStoreSchema = {
	servers: McpSettings;
	oauth: Record<string, McpOAuthState>;
};

export type McpOAuthStorage = {
	load: () => McpOAuthState;
	save: (state: McpOAuthState) => void;
};

export type McpOAuthProviderParams = {
	storage: McpOAuthStorage;
	clientId?: string;
	clientSecret?: string;
	onRedirect?: (url: URL) => void;
};
