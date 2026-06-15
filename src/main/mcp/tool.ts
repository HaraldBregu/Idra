import { Tool } from '../agent/core/tool';
import type { McpClient } from './client';

export class McpTool extends Tool {
	readonly name: string;
	readonly description?: string;
	readonly schema?: Record<string, unknown>;

	constructor(
		private readonly client: McpClient,
		private readonly rawToolName: string,
		description: string | undefined,
		inputSchema: Record<string, unknown>
	) {
		super();
		this.name = `mcp__${client.config.id}__${rawToolName}`;
		this.description = `[${client.config.label}] ${description ?? rawToolName}`;
		this.schema = inputSchema;
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		return this.client.callTool(this.rawToolName, input);
	}
}
