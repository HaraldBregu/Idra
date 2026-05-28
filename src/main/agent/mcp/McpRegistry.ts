import type { ConnectorConfig } from '../../connectors';
import type { AgentHarnessMcpServerConfig } from '../harness/mcp';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[] = []): AgentHarnessMcpServerConfig[] {
		return connectors.flatMap((connector) => connector.enabled === false ? [] : [{
			name: connector.id,
			transport: 'http' as const,
			url: typeof connector.config?.url === 'string' ? connector.config.url : 'http://localhost',
		}]);
	}
}
