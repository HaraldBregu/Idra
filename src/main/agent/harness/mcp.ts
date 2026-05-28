import type { AgentHarnessExternalToolProvider, AgentHarnessTool } from './types';

export type AgentHarnessMcpServerConfig =
	| { name: string; transport: 'stdio'; command: string; args?: string[] }
	| { name: string; transport: 'http'; url: string };

export class McpAgentHarnessToolProvider implements AgentHarnessExternalToolProvider {
	constructor(private readonly servers: AgentHarnessMcpServerConfig[] = []) {}
	async discover(): Promise<AgentHarnessTool[]> {
		return [];
	}
	getInventory() {
		return { servers: this.servers.length, tools: [], resources: [], prompts: [] };
	}
	async close(): Promise<void> {}
}
