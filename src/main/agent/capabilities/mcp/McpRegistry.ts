import type { ConnectorConfig } from '../../../../shared/connector';
import type { AgentRuntimeMcpServerConfig } from '../../execution/runtime/mcp';
import { resolveMcpConfig } from './config';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[] = []): AgentRuntimeMcpServerConfig[] {
		return connectors.flatMap((connector) => {
			if (connector.enabled === false) return [];
			if (connector.oauth && !connector.oauth.token?.accessToken && !connector.authorization?.trim()) return [];
			try {
				const config = resolveMcpConfig(connector);
				const name = connector.serverLabel ?? connector.id ?? connector.name ?? connector.connectorId ?? 'connector';
				return [{ name, toolPrefix: name, ...config }];
			} catch {
				return [];
			}
		});
	}
}
