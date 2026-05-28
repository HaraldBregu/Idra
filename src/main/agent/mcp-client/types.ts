import type { ConnectorTool } from '../../connectors';

export interface AgentMcpClientServicePort {
	test(id: string): Promise<{ ok: boolean; message?: string }>;
	reconnect(id: string): Promise<{ ok: boolean; message?: string }>;
	refreshTools(id: string): Promise<ConnectorTool[]>;
	listTools(id: string): ConnectorTool[];
	callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	closeConnector(id: string): Promise<void>;
}
