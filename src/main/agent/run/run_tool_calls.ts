import type { RuntimeEvent, Tool, ToolCall } from '../types';
import type { ToolsContext } from '../context';
import type { AgentPermissionMode } from '../../../shared/agent_types';
import { runToolCall, type ToolCallSecurityContext } from './run_tool_call';

export async function* runToolCalls(
	tools: Tool[],
	toolCalls: ToolCall[],
	interactive = true,
	signal?: AbortSignal,
	context?: ToolsContext,
	permissionMode: AgentPermissionMode = 'ask',
	security?: ToolCallSecurityContext
): AsyncGenerator<RuntimeEvent, void> {
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

	for (const toolCall of toolCalls) {
		yield* runToolCall(
			toolMap.get(toolCall.name),
			toolCall,
			interactive,
			signal,
			context,
			permissionMode,
			security
		);
	}
}
