import type { Settings as ConnectorSettings } from '../../connectors';
import type { ProviderMcpServerSpec } from '../../llm/types';

export class AgentMcp {
	constructor(private readonly connectors?: ConnectorSettings) {}

	list(): ProviderMcpServerSpec[] {
		if (!this.connectors) return [];

		return Object.values(this.connectors.list())
			.filter((connector) => connector.enabled !== false)
			.map((connector) => ({
				type: 'mcp' as const,
				server_label: connector.server_label,
				server_url: connector.server_url,
				...(connector.authorization ? { authorization: connector.authorization } : {}),
				...(connector.require_approval
					? { require_approval: connector.require_approval }
					: {}),
				...(connector.defer_loading !== undefined
					? { defer_loading: connector.defer_loading }
					: {}),
				...(connector.server_description
					? { server_description: connector.server_description }
					: {}),
			}));
	}
}
