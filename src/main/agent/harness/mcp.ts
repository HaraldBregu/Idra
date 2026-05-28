import type { AgentHarnessExternalToolProvider, AgentHarnessTool } from './types';

export type AgentHarnessMcpServerConfig =
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
