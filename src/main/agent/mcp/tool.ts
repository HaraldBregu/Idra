import { Tool } from '../core/tool';
import type { Context } from '../core/tool';
import type { JSONSchema } from '../core/types';
import type { McpManager } from '../../mcp';

type CallToolResult = Awaited<ReturnType<McpManager['callTool']>>;

export interface McpToolDefinition {
	readonly name: string;
	readonly description?: string;
	readonly inputSchema?: unknown;
}

/**
 * Adapts a single tool exposed by an MCP server to the agent `Tool` interface.
 * `run` proxies the call back through the `Connector`, which owns the live
 * client connection to the server.
 */
export class McpTool extends Tool {
	readonly name: string;
	readonly description: string;
	readonly schema: JSONSchema;

	constructor(
		context: Context,
		private readonly connector: McpManager,
		private readonly serverId: string,
		private readonly definition: McpToolDefinition
	) {
		super(context);
		this.name = mcpToolName(serverId, definition.name);
		this.description =
			definition.description ?? `Tool "${definition.name}" from MCP server "${serverId}".`;
		this.schema = isJsonSchema(definition.inputSchema)
			? definition.inputSchema
			: { type: 'object', properties: {} };
	}

	async run(input: Record<string, unknown>): Promise<unknown> {
		const result = await this.connector.callTool(this.serverId, this.definition.name, input);
		return extractContent(result);
	}
}

// ponytail: sanitize to the [a-zA-Z0-9_-] tool-name charset; rare collisions
// between sanitized names are accepted. The original name is kept for the call.
export function mcpToolName(serverId: string, toolName: string): string {
	const safe = `mcp__${serverId}__${toolName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
	return safe.slice(0, 64);
}

function extractContent(result: CallToolResult): unknown {
	const blocks = Array.isArray(result.content) ? result.content : [];
	const text = blocks
		.filter((block) => block.type === 'text' && typeof block.text === 'string')
		.map((block) => block.text as string)
		.join('\n');
	if (!text) return result;
	return result.isError ? `Error: ${text}` : text;
}

function isJsonSchema(value: unknown): value is JSONSchema {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
