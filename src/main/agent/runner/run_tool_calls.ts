import type { RuntimeEvent, Tool, ToolCall } from '../types';
import type { ToolsContext } from '../context';
import type { AgentRunType } from '../../../shared/agent_types';
import { runToolCall, type ToolCallSecurityContext } from './run_tool_call';
import type { KeyedMutex } from '../mutex';

export async function* runToolCalls(
	tools: Tool[],
	toolCalls: ToolCall[],
	type: AgentRunType,
	signal?: AbortSignal,
	context?: ToolsContext,
	security?: ToolCallSecurityContext,
	resources?: KeyedMutex
): AsyncGenerator<RuntimeEvent, void> {
	for (const toolCall of toolCalls) {
		yield* runToolCall(
			tools.find((tool) => tool.id === toolCall.name),
			toolCall,
			type,
			signal,
			context,
			security,
			resources
		);
	}
}
