import { z } from 'zod';
import type { AgentContext } from '../agent/context';
import type { Message, ToolCall } from '../agent/messages';
import { resolvePermission } from '../permissions/permissions';
import type { ToolResult } from './tool';

export async function runToolUse(toolCall: ToolCall, context: AgentContext): Promise<Message> {
	const tool = context.tools.find((entry) => entry.name === toolCall.name);
	if (!tool) return toolError(toolCall, `Unknown tool: ${toolCall.name}`);
	const parsed = tool.inputSchema.safeParse(toolCall.input);
	if (!parsed.success) return toolError(toolCall, z.prettifyError(parsed.error));
	const semanticValidation = await tool.validateInput?.(parsed.data, context);
	if (semanticValidation?.ok === false) return toolError(toolCall, semanticValidation.message);
	const permission = await resolvePermission(tool, parsed.data, context);
	if (permission.behavior !== 'allow') return toolError(toolCall, permission.message);
	const input = permission.input === undefined ? parsed.data : permission.input;
	const result = await context.metrics.measure(`tool.${tool.name}`, () =>
		tool.call(input, context)
	);
	context.logger.event('tool_use_completed', {
		toolName: tool.name,
		success: true,
	});
	return serializeToolResult(toolCall, result);
}

function toolError(toolCall: ToolCall, message: string): Message {
	return {
		role: 'tool',
		name: toolCall.name,
		toolCallId: toolCall.id,
		content: message,
		isError: true,
	};
}

function serializeToolResult(toolCall: ToolCall, result: ToolResult<unknown>): Message {
	return {
		role: 'tool',
		name: toolCall.name,
		toolCallId: toolCall.id,
		content: result.content ?? JSON.stringify(result.data),
	};
}
