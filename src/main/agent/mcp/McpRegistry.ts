import type { ConnectorConfig } from '../../../shared/connector';
import type { AgentHarnessMcpServerConfig } from '../harness/mcp';
import { missingMcpSecretNames, resolveMcpConfig } from '../mcp-client';

export class McpRegistry {
	buildServers(connectors: readonly ConnectorConfig[]): AgentHarnessMcpServerConfig[] {
		const servers: AgentHarnessMcpServerConfig[] = [];
		for (const connector of connectors) {
			if (connector.enabled === false || !connector.mcp || missingMcpSecretNames(connector).length > 0) continue;
			if (connector.oauth && !connector.oauth.token?.accessToken) continue;
			const config = resolveMcpConfig(connector);
			const serverLabel = connector.serverLabel ?? connector.id ?? connector.connectorId ?? 'connector';
			if (config.transport === 'http') {
				servers.push({
					name: serverLabel,
					transport: 'http',
					url: config.url,
					headers: config.headers,
					sessionId: config.sessionId,
					toolPrefix: serverLabel,
				});
				continue;
			}
			servers.push({
				name: serverLabel,
				transport: 'stdio',
				command: config.command,
				args: config.args,
				cwd: config.cwd,
				env: config.env,
				toolPrefix: serverLabel,
			});
		}
		return servers;
	}
}
