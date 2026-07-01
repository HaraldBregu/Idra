import { jsonTool } from '../../tool';
import type { JSONSchema } from '../../types';
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

export function mcpTool(
	client: McpClient,
	toolName: string,
	description: string,
	schema: JSONSchema,
	serverId: string,
) {
	return jsonTool({
		name: `mcp__${serverId}__${toolName}`,
		description,
		schema,
		execute: async (input) => {
			const result = (await client.callTool(toolName, input)) as CallResult;
			const text = extractText(result);
			if (result.isError) throw new Error(text || `MCP tool ${toolName} failed.`);
			return text;
		},
	});
}
