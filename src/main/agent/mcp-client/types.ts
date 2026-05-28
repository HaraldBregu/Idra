import type {
	ConnectorCallToolOptions,
	ConnectorConfig,
	ConnectorTestResult,
	ConnectorTool,
} from '../../../shared/connector';

export interface ConnectorMcpClient {
	listTools(options?: ConnectorCallToolOptions): Promise<ConnectorTool[]>;
	callTool(name: string, args: Record<string, unknown>, options?: ConnectorCallToolOptions): Promise<unknown>;
	listResources(options?: ConnectorCallToolOptions): Promise<unknown>;
	readResource(uri: string, options?: ConnectorCallToolOptions): Promise<unknown>;
	listPrompts(options?: ConnectorCallToolOptions): Promise<unknown>;
	getPrompt(
		name: string,
		args: Record<string, unknown>,
		options?: ConnectorCallToolOptions
	): Promise<unknown>;
	close(): Promise<void>;
}

export type ConnectorMcpClientFactory = (connector: ConnectorConfig) => ConnectorMcpClient;

export interface McpConnectorStore {
	listConnectorsForMcp(): ConnectorConfig[];
	getConnectorForMcp(id: string): ConnectorConfig;
	saveConnectorFromMcp(connector: ConnectorConfig): ConnectorConfig;
}

export interface AgentMcpClientServicePort {
	list(): ConnectorConfig[];
	test(id: string): Promise<ConnectorTestResult>;
	reconnect(id: string): Promise<ConnectorTestResult>;
	refreshTools(id: string): Promise<ConnectorTool[]>;
	listTools(id: string): ConnectorTool[];
	callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	listResources(id: unknown, options?: unknown): Promise<unknown>;
	readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown>;
	listPrompts(id: unknown, options?: unknown): Promise<unknown>;
	getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	refreshConnectorToolsIfConfigured(connector: ConnectorConfig): Promise<ConnectorConfig>;
	closeConnector(id: string): Promise<void>;
	close(): Promise<void>;
}

export type {
	ResolvedHttpMcpConfig,
	ResolvedMcpConfig,
	ResolvedStdioMcpConfig,
} from '../../connectors/config';
