import { Service } from 'typedi';
import { AgentMcp } from '../agent/core/mcp';
import { ConnectorSettingsService } from './connector-settings-service';
import type { ProviderMcpServerSpec } from '../llm/types';
import type { ConnectorId } from '../../shared/connector';

const OPENAI_CONNECTOR_IDS = {
	gmail: 'connector_gmail',
	calendar: 'connector_googlecalendar',
} as const satisfies Record<ConnectorId, string>;

@Service()
export class AgentMcpService extends AgentMcp {
	constructor(private readonly connectors: ConnectorSettingsService) {
		super();
	}

	list(providerId: string): ProviderMcpServerSpec[] {
		if (providerId.trim().toLowerCase() !== 'openai') return [];

		return Object.entries(this.connectors.list())
			.filter(([, connector]) => connector.enabled !== false)
			.map(([id, connector]) => {
				const connectorId = OPENAI_CONNECTOR_IDS[id as ConnectorId];

				return {
					type: 'mcp' as const,
					server_label: connector.server_label,
					...(connectorId ? { connector_id: connectorId } : {}),
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
				};
			});
	}
}
