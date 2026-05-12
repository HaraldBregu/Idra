import type { ConnectorConfig, ConnectorTool } from '../../shared/connectors';
import type { McpCallOptions } from './timeout';

export interface IMcpTransportAdapter {
	connect(options?: McpCallOptions): Promise<void>;
	disconnect(): Promise<void>;
	reconnect(options?: McpCallOptions): Promise<void>;
	healthCheck(options?: McpCallOptions): Promise<boolean>;
	refreshTools(options?: McpCallOptions): Promise<ConnectorTool[]>;
	listTools(options?: McpCallOptions): Promise<ConnectorTool[]>;
	callTool(name: string, args: unknown, options?: McpCallOptions): Promise<unknown>;
}

export interface McpTransportFactory {
	create(config: ConnectorConfig): IMcpTransportAdapter;
}
