import type { ConnectorConfig, OpenAiMcpConnectorToolSpec } from '../../../shared/connector';

export function toAnthropicConnectorTools(
	_connectors: readonly ConnectorConfig[],
	_env: NodeJS.ProcessEnv
): OpenAiMcpConnectorToolSpec[] {
	return [];
}
