import type { FileAccessContext } from '../context';
import type { KeyedMutex } from '../mutex';
import type { RuntimeEvent, Tool, ToolCall } from '../types';
import { runToolCall, type ToolCallSecurityContext } from './run_tool_call';

export async function* runToolCalls(
	tools: Tool[],
	toolCalls: ToolCall[],
	signal?: AbortSignal,
	context?: FileAccessContext,
	security?: ToolCallSecurityContext,
	resources?: KeyedMutex
): AsyncGenerator<RuntimeEvent, void> {
	for (const toolCall of toolCalls) {
		yield* runToolCall(
			tools.find((tool) => tool.id === toolCall.name),
			toolCall,
			signal,
			context,
			security,
			resources
		);
		if (signal?.aborted) break;
	}
}
