import { callTool, type McpCallResult, type McpClient } from '../../../app/mcp';
import { jsonTool } from '../tool';
import type { JSONSchema } from '../../types';
import type { McpApprovalPolicy } from '../../../../shared/mcp_types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function extractText(result: McpCallResult): string {
	const content = result.content;
	if (!Array.isArray(content)) return content === undefined ? '' : JSON.stringify(content);
	const texts = content
		.filter(
			(b): b is { text: string } => isRecord(b) && b.type === 'text' && typeof b.text === 'string'
		)
		.map((b) => b.text);
	return texts.length > 0 ? texts.join('\n') : JSON.stringify(content);
}

export function mcpTool(
	client: McpClient,
	toolName: string,
	description: string,
	schema: JSONSchema,
	serverId: string,
	approval?: McpApprovalPolicy
) {
	return jsonTool({
		name: `mcp__${serverId}__${toolName}`,
		description,
		defaultPermission: approval === 'never' ? 'allow' : 'ask',
		schema,
		execute: async (input) => {
			const result = (await callTool(client, toolName, input)) as McpCallResult;
			const text = extractText(result);
			if (result.isError) throw new Error(text || `MCP tool ${toolName} failed.`);
			return text;
		},
	});
}
