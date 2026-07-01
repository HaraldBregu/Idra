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

export class McpStore {
	private readonly store: Store<ConnectorStoreSchema>;

	constructor(private readonly config: Config, defaults: ConnectorStoreSchema) {
		this.store = new Store<ConnectorStoreSchema>({
			name: MCP_STORE_NAME,
			cwd: path.resolve(this.config.location),
			accessPropertiesByDotNotation: false,
			defaults,
		});
	}

	servers(): McpSettings {
		return this.store.store.mcpServers ?? {};
	}

	write(servers: McpSettings): void {
		this.store.set('mcpServers', servers);
	}

	oauth(id: string): McpOAuthState {
		return this.store.store.oauth?.[id] ?? {};
	}

	saveOauth(id: string, state: McpOAuthState): void {
		this.store.set('oauth', { ...(this.store.store.oauth ?? {}), [id]: state });
	}
}
