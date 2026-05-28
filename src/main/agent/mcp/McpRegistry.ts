import type { ConnectorConfig } from '../../../shared/connector';
import type { AgentHarnessMcpServerConfig } from '../harness/mcp';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[] = []): AgentHarnessMcpServerConfig[] {
		return connectors.flatMap((connector) => connector.enabled === false ? [] : [{
			name: connector.id,
			transport: 'http' as const,
			url: typeof connector.mcp === 'object' && connector.mcp && 'url' in connector.mcp && typeof connector.mcp.url === 'string' ? connector.mcp.url : 'http://localhost',
		}]);
	}
}
