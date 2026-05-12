import type { ConnectorConfig } from '../../shared/connectors';
import { McpConnectionError } from './errors';
import type { IMcpTransportAdapter, McpTransportFactory } from './types';
import { HttpMcpTransport } from './transports/HttpMcpTransport';
import { StdioMcpTransport } from './transports/StdioMcpTransport';

export class McpClientFactory implements McpTransportFactory {
	create(config: ConnectorConfig): IMcpTransportAdapter {
		if (config.transport === 'stdio') {
			return new StdioMcpTransport(config);
		}
		if (config.transport === 'http') {
			return new HttpMcpTransport(config);
		}
		throw new McpConnectionError(`Unsupported connector transport: ${config.transport}`);
	}
}
