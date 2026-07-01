import type {
	OAuthClientInformationMixed,
	OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { McpSettings } from '../../../shared/mcp/mcp';

export type McpOAuthState = {
	clientInformation?: OAuthClientInformationMixed;
	tokens?: OAuthTokens;
	codeVerifier?: string;
};

export type ConnectorStoreSchema = {
	mcpServers: McpSettings;
	oauth: Record<string, McpOAuthState>;
};

export type McpOAuthStorage = {
	load: () => McpOAuthState;
	save: (state: McpOAuthState) => void;
};
