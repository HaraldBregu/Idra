import type {
	ConnectorApprovalMode,
	ConnectorConfig,
	ConnectorTool,
	OpenAiConnectorRequireApproval,
	OpenAiMcpConnectorToolSpec,
} from '../../../shared/connector';
import {
	applyToolPolicy,
	connectorAuthorization,
	isOpenAiResponsesConnector,
	toConnectorStatus,
	uniqueStrings,
} from '../components/runtime';

export function openAiResponsesConnectorTools(connector: ConnectorConfig): ConnectorTool[] {
	const names = connector.tools.length > 0
		? connector.tools.map((tool) => tool.name)
		: connector.allowedTools;
	const tools = uniqueStrings(names).map((name) => ({
		name,
		description: name,
		inputSchema: { type: 'object' },
		permission: 'always-allow' as const,
		requiresApproval: false,
	}));
	return applyToolPolicy(tools, connector.allowedTools, connector.requireApproval);
}

export function withOpenAiResponsesConnectorTools(connector: ConnectorConfig): ConnectorConfig {
	return {
		...connector,
		tools: openAiResponsesConnectorTools(connector),
		lastError: undefined,
		updatedAt: new Date().toISOString(),
	};
}

export function toOpenAiConnectorTools(
	connectors: readonly ConnectorConfig[],
	env: NodeJS.ProcessEnv
): OpenAiMcpConnectorToolSpec[] {
	return connectors
		.filter((connector) => connector.enabled && toConnectorStatus(connector, env) === 'configured')
		.filter(isOpenAiResponsesConnector)
		.map(toOpenAiMcpTool);
}

function toOpenAiMcpTool(connector: ConnectorConfig): OpenAiMcpConnectorToolSpec {
	const authorization = connectorAuthorization(connector);
	const tool: OpenAiMcpConnectorToolSpec = {
		type: 'mcp',
		server_label: connector.serverLabel,
		require_approval: toOpenAiRequireApproval(connector.requireApproval, connector.allowedTools),
	};
	if (connector.serverUrl) {
		tool.server_url = connector.serverUrl;
		if (authorization) tool.authorization = authorization;
	} else {
		tool.connector_id = connector.connectorId;
		tool.authorization = authorization;
	}
	if (connector.allowedTools.length > 0) tool.allowed_tools = [...connector.allowedTools];
	if (connector.deferLoading) tool.defer_loading = true;
	if (connector.serverDescription) tool.server_description = connector.serverDescription;
	return tool;
}

function toOpenAiRequireApproval(
	mode: ConnectorApprovalMode,
	allowedTools: readonly string[]
): OpenAiConnectorRequireApproval {
	if (mode === 'always') return 'always';
	if (mode === 'never') return 'never';
	return { never: { tool_names: [...allowedTools] } };
}
