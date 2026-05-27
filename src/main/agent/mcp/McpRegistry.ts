import type { ConnectorConfig } from '../../../shared/connector';
import type { AgentHarnessMcpServerConfig } from '../harness/mcp';
import { missingMcpSecretNames, resolveMcpConfig } from '../connectors/mcp-client';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[]): AgentHarnessMcpServerConfig[] {
		const servers: AgentHarnessMcpServerConfig[] = [];
		for (const connector of connectors) {
			if (!connector.enabled || !connector.mcp || missingMcpSecretNames(connector).length > 0) continue;
			const config = resolveMcpConfig(connector);
			if (config.transport === 'http') {
				servers.push({
					name: connector.serverLabel,
					transport: 'http',
					url: config.url,
					headers: config.headers,
					sessionId: config.sessionId,
					toolPrefix: connector.serverLabel,
				});
				continue;
			}
			servers.push({
				name: connector.serverLabel,
				transport: 'stdio',
				command: config.command,
				args: config.args,
				cwd: config.cwd,
				env: config.env,
				toolPrefix: connector.serverLabel,
			});
		}
		return servers;
	}
}
