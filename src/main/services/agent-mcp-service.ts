import { Service } from 'typedi';
import { Mcp } from '../agent/core/mcp';
import { ConnectorSettingsService } from './connector-settings-service';
import type { McpConfig } from '../agent/core/mcp';
import type { ConnectorId } from '../../shared/connector';

const OPENAI_CONNECTOR_IDS = {
	gmail: 'connector_gmail',
	calendar: 'connector_googlecalendar',
} as const satisfies Record<ConnectorId, string>;

@Service()
export class AgentMcpService extends Mcp {
	constructor(private readonly connectors: ConnectorSettingsService) {
		super();
	}

	list(): McpConfig {
		const tools: McpConfig['tools'] = [];
		const servers: McpConfig['servers'] = [];

		for (const [id, connector] of Object.entries(this.connectors.list())) {
			if (connector.enabled === false) continue;

			const connectorId = OPENAI_CONNECTOR_IDS[id as ConnectorId];
			tools.push({
				serverLabel: connector.server_label,
				...(connectorId ? { connectorId } : {}),
				...(connector.authorization ? { authorization: connector.authorization } : {}),
				...(connector.require_approval ? { requireApproval: connector.require_approval } : {}),
				...(connector.defer_loading !== undefined
					? { deferLoading: connector.defer_loading }
					: {}),
				...(connector.server_description
					? { serverDescription: connector.server_description }
					: {}),
			});
			servers.push({
				name: connector.server_label,
				url: connector.server_url,
				...(connector.authorization ? { authorizationToken: connector.authorization } : {}),
			});
		}

		return { tools, servers };
	}
}
