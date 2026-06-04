import type { ConnectorRecord } from '../../shared/connectors';
import type { ProviderBuiltInToolSpec } from '../llm/types';
import type { ConnectorsService } from '../connectors';

type ConnectorEntry = ConnectorRecord[string];

export class McpService {
	constructor(private readonly connectors: Pick<ConnectorsService, 'getConnectorSettings'>) {}

	createToolsForProvider(providerId: string): ProviderBuiltInToolSpec[] {
		const connectors = Object.entries(this.connectors.getConnectorSettings())
			.filter((entry): entry is [string, ConnectorEntry] => isEnabled(entry[1]));
		const provider = providerId.trim().toLowerCase();
		if (provider === 'openai') {
			return connectors.map(([id, connector]) => ({
				type: 'mcp',
				server_label: connector.server_label,
				connector_id: id,
				server_url: connector.server_url,
				...(connector.authorization ? { authorization: connector.authorization } : {}),
				require_approval: connector.require_approval ?? 'always',
				...(connector.defer_loading ? { defer_loading: true } : {}),
				...(connector.server_description ? { server_description: connector.server_description } : {}),
			}));
		}
		if (provider === 'anthropic') {
			return connectors.map(([, connector]) => ({
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
}

function isEnabled(connector: ConnectorEntry): boolean {
	return connector.type === 'mcp' && connector.enabled !== false;
}
