import path from 'node:path';
import Store from 'electron-store';
import type {
	OAuthClientInformationMixed,
	OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import type { McpSettings } from '../../../shared/mcp/mcp';
import { Config } from '../core/config';

export type McpOAuthState = {
	clientInformation?: OAuthClientInformationMixed;
	tokens?: OAuthTokens;
	codeVerifier?: string;
};

export type ConnectorStoreSchema = {
	mcpServers: McpSettings;
	oauth: Record<string, McpOAuthState>;
};

export const DEFAULT_MCP_SETTINGS: ConnectorStoreSchema = { mcpServers: {}, oauth: {} };

const MCP_STORE_NAME = 'mcp';

export type McpStore = {
	servers(): McpSettings;
	write(servers: McpSettings): void;
	oauth(id: string): McpOAuthState;
	saveOauth(id: string, state: McpOAuthState): void;
};

export function createMcpStore(config: Config, defaults: ConnectorStoreSchema): McpStore {
	const store = new Store<ConnectorStoreSchema>({
		name: MCP_STORE_NAME,
		cwd: path.resolve(config.location),
		accessPropertiesByDotNotation: false,
		defaults,
	});

	return {
		servers() {
			return store.store.mcpServers ?? {};
		},
		write(servers: McpSettings) {
			store.set('mcpServers', servers);
		},
		oauth(id: string) {
			return store.store.oauth?.[id] ?? {};
		},
		saveOauth(id: string, state: McpOAuthState) {
			store.set('oauth', { ...(store.store.oauth ?? {}), [id]: state });
		},
	};
}
