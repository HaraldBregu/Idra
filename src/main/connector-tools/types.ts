import type { ConnectorCallToolOptions, ConnectorConfig, ConnectorTool } from '../../shared/connector';

export type ConnectorMcpClient = {
	listTools(): Promise<ConnectorTool[]>;
	callTool(name: string, args: Record<string, unknown>, options?: ConnectorCallToolOptions): Promise<unknown>;
	listResources?(): Promise<unknown>;
	readResource?(uri: string, options?: unknown): Promise<unknown>;
	listPrompts?(options?: unknown): Promise<unknown>;
	getPrompt?(name: string, args: Record<string, unknown>, options?: unknown): Promise<unknown>;
	close?(): Promise<void>;
};

export interface ConnectorToolsServiceOptions {
	mcpClientFactory?: (connector: ConnectorConfig, secrets: Record<string, string>) => ConnectorMcpClient;
	env?: NodeJS.ProcessEnv;
}
