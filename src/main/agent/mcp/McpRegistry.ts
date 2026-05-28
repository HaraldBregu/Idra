import type { ConnectorConfig } from '../../../shared/connector';
import type { AgentHarnessMcpServerConfig } from '../harness/mcp';
import { resolveMcpConfig } from './config';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[] = []): AgentHarnessMcpServerConfig[] {
		return connectors.flatMap((connector) => {
			if (connector.enabled === false) return [];
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
