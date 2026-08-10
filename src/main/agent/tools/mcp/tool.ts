import { callTool, type McpCallResult, type McpClient } from '../../../mcp';
import { jsonTool } from '../tool';
import type { JSONSchema } from '../../types';
import type { McpApprovalPolicy } from '../../../../shared/mcp_types';
import { MCP_MAX_OUTPUT_BYTES, MCP_TOOL_TIMEOUT_MS } from './limits';
import { mcpToolName } from './name';
import { mcpOutputText } from './output';
import { mcpInputParser } from './schema';

export function mcpTool(
	client: McpClient,
	toolName: string,
	description: string,
	schema: JSONSchema,
	serverId: string,
	_approval?: McpApprovalPolicy,
	runtimeName = mcpToolName(serverId, toolName, new Set())
) {
	const parseInput = mcpInputParser(schema);
	return jsonTool({
		name: runtimeName,
		description,
		timeoutMs: MCP_TOOL_TIMEOUT_MS,
		maxOutputBytes: MCP_MAX_OUTPUT_BYTES,
		parseInput,
		schema,
		execute: async (input, signal) => {
			const result = (await callTool(
				client,
				toolName,
				input,
				MCP_TOOL_TIMEOUT_MS,
				signal
			)) as McpCallResult;
			const text = mcpOutputText(result);
			if (result.isError) throw new Error(text || `MCP tool ${toolName} failed.`);
			return text;
		},
	});
}
