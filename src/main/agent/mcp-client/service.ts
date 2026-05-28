import type { ConnectorTool } from '../../connectors';
import type { AgentMcpClientServicePort } from './types';

export class AgentMcpClientService implements AgentMcpClientServicePort {
	private readonly tools = new Map<string, ConnectorTool[]>();
	constructor(private readonly logger?: { warn(source: string, message: string, data?: unknown): void }, private readonly connectors?: unknown) {}
	async test(): Promise<{ ok: boolean; message?: string }> { return { ok: true }; }
	async reconnect(): Promise<{ ok: boolean; message?: string }> { return { ok: true }; }
	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const tools: ConnectorTool[] = [];
		this.tools.set(id, tools);
		return tools;
	}
	listTools(id: string): ConnectorTool[] { return this.tools.get(id) ?? []; }
	async callTool(_id: unknown, name: unknown): Promise<unknown> { throw new Error(`MCP tool is unavailable: ${String(name)}`); }
	async closeConnector(id: string): Promise<void> { this.tools.delete(id); }
}
