import type { Tool as ResponseTool } from 'openai/resources/responses/responses';
import type { ConnectorConfig } from '../../shared/connectors';

type McpTool = ResponseTool.Mcp;

function approvalPolicy(_connector: ConnectorConfig): McpTool['require_approval'] {
	return 'never';
}

export class McpRegistry {
	buildTools(connectors: readonly ConnectorConfig[]): McpTool[] {
		return connectors
			.filter((connector) => connector.enabled && connector.authorization.trim().length > 0)
			.map((connector) => {
				const tool: McpTool = {
					type: 'mcp',
					server_label: connector.serverLabel,
					connector_id: connector.connectorId,
					authorization: connector.authorization,
					require_approval: approvalPolicy(connector),
				};

				if (connector.serverDescription?.trim()) {
					tool.server_description = connector.serverDescription.trim();
				}

				if (connector.allowedTools.length > 0) {
					tool.allowed_tools = connector.allowedTools;
				}

				if (connector.deferLoading) {
					tool.defer_loading = true;
				}

				return tool;
			});
	}
}
