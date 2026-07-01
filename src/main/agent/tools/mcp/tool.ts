import { BaseTool, type Context } from '../../core/types';
import type { JSONSchema } from '../../core/types';
import type { McpClient } from '../../mcp/client';

type CallResult = { content?: unknown; isError?: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function extractText(result: CallResult): string {
	const content = result.content;
	if (!Array.isArray(content)) return content === undefined ? '' : JSON.stringify(content);
	const texts = content
		.filter((b): b is { text: string } => isRecord(b) && b.type === 'text' && typeof b.text === 'string')
		.map((b) => b.text);
	return texts.length > 0 ? texts.join('\n') : JSON.stringify(content);
}

export class McpTool extends BaseTool {
	readonly name: string;

	constructor(
		context: Context,
		private readonly client: McpClient,
		private readonly toolName: string,
		readonly description: string,
		readonly schema: JSONSchema,
		serverId: string,
	) {
		super(context);
		this.name = `mcp__${serverId}__${toolName}`;
	}

	async run(input: Record<string, unknown>): Promise<string> {
		const result = (await this.client.callTool(this.toolName, input)) as CallResult;
		const text = extractText(result);
		if (result.isError) throw new Error(text || `MCP tool ${this.toolName} failed.`);
		return text;
	}
}
