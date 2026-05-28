import type { ConnectorTestResult, ConnectorTool } from '../../../shared/connector';
import type { AgentMcpClientServicePort } from './types';

export class AgentMcpClientService implements AgentMcpClientServicePort {
	private readonly tools = new Map<string, ConnectorTool[]>();
	constructor(_logger?: { warn(source: string, message: string, data?: unknown): void }, _connectors?: unknown) {}
	async test(): Promise<ConnectorTestResult> { return { status: 'connected' }; }
	async reconnect(): Promise<ConnectorTestResult> { return { status: 'connected' }; }
	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const tools: ConnectorTool[] = [];
		this.tools.set(id, tools);
		return tools;
	}
	listTools(id: string): ConnectorTool[] { return this.tools.get(id) ?? []; }
	async callTool(_id: unknown, name: unknown): Promise<unknown> { throw new Error(`MCP tool is unavailable: ${String(name)}`); }
	async closeConnector(id: string): Promise<void> { this.tools.delete(id); }
}
