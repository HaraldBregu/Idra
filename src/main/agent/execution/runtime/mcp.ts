import type { AgentRuntimeExternalToolProvider, AgentRuntimeTool } from './types';

export type AgentRuntimeMcpServerConfig =
	| {
			name: string;
			transport: 'stdio';
			command: string;
			args?: string[];
			cwd?: string;
			env?: Record<string, string>;
			toolPrefix?: string;
	  }
	| {
			name: string;
			transport: 'http';
			url: string;
			method?: 'POST';
			headers?: Record<string, string>;
			sessionId?: string;
			toolPrefix?: string;
	  };

export class McpAgentRuntimeToolProvider implements AgentRuntimeExternalToolProvider {
	constructor(private readonly servers: AgentRuntimeMcpServerConfig[] = []) {}
	async discover(): Promise<AgentRuntimeTool[]> {
		return [];
	}
	getInventory() {
		return { servers: this.servers.length, tools: [], resources: [], prompts: [] };
	}
	async close(): Promise<void> {}
}
