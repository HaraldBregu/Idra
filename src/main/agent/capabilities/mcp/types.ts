import type { ConnectorTestResult, ConnectorTool } from '../../../../shared/connector';

export interface AgentMcpClientServicePort {
	test(id: string): Promise<ConnectorTestResult>;
	reconnect(id: string): Promise<ConnectorTestResult>;
	refreshTools(id: string): Promise<ConnectorTool[]>;
	listTools(id: string): ConnectorTool[];
	callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	closeConnector(id: string): Promise<void>;
}
