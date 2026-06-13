import { Service } from 'typedi';
import { McpData as CoreMcpData } from '../agent/core/mcp';
import { ConnectorSettingsService } from '../services/connector-settings-service';
import type { Mcp } from '../agent/core/mcp';
import type { ConnectorId } from '../../shared/connector';

const OPENAI_CONNECTOR_IDS = {
	gmail: 'connector_gmail',
	calendar: 'connector_googlecalendar',
} as const satisfies Record<ConnectorId, string>;

@Service()
export class McpData extends CoreMcpData {
	constructor(private readonly connectors: ConnectorSettingsService) {
		super();
	}

	list(): Mcp[] {
		const mcp: Mcp[] = [];

		for (const [id, connector] of Object.entries(this.connectors.list())) {
			if (connector.enabled === false) continue;

			const connectorId = OPENAI_CONNECTOR_IDS[id as ConnectorId];
			mcp.push({
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
		}

		return mcp;
	}
}
