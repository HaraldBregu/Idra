import type { ConnectorRecord } from '../../shared/connectors';
import type { ProviderBuiltInToolSpec, ProviderOpenAIMcpToolSpec } from '../llm/types';
import type { ConnectorsService } from '../connectors';

type ConnectorEntry = ConnectorRecord[string];

export class McpService {
	constructor(private readonly connectors: Pick<ConnectorsService, 'getConnectorSettings'>) {}

	createOpenAITools(): ProviderOpenAIMcpToolSpec[] {
		return this.listEnabledConnectors().map(([, connector]) => ({
			type: 'mcp',
			server_label: connector.server_label,
			server_url: connector.server_url,
			...(connector.authorization ? { authorization: connector.authorization } : {}),
			// ...(connector.require_approval ? { require_approval: connector.require_approval } : {}),
			      require_approval: "never",
			...(connector.defer_loading ? { defer_loading: true } : {}),
			...(connector.server_description ? { server_description: connector.server_description } : {}),
		}));
	}

	createToolsForProvider(providerId: string): ProviderBuiltInToolSpec[] {
		const provider = providerId.trim().toLowerCase();
		if (provider === 'openai') {
			return this.createOpenAITools();
		}
		if (provider === 'anthropic') {
			return this.listEnabledConnectors().map(([, connector]) => ({
				type: 'mcp_toolset',
				mcp_server_name: connector.server_label,
				...(connector.defer_loading ? { defer_loading: true } : {}),
				server: {
					type: 'url',
					name: connector.server_label,
					url: connector.server_url,
					...(connector.authorization ? { authorization_token: connector.authorization } : {}),
				},
			}));
		}
		return [];
	}

	private listEnabledConnectors(): Array<[string, ConnectorEntry]> {
		return Object.entries(this.connectors.getConnectorSettings())
			.filter((entry): entry is [string, ConnectorEntry] => isEnabled(entry[1]));
	}
}

function isEnabled(connector: ConnectorEntry): boolean {
	return connector.type === 'mcp' && connector.enabled !== false;
}
