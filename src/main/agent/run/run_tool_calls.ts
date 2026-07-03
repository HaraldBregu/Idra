import type { RuntimeEvent, Tool, ToolCall } from '../types';
import { runToolCall } from './run_tool_call';

export async function* runToolCalls(
	tools: Tool[],
	toolCalls: ToolCall[],
): AsyncGenerator<RuntimeEvent, void> {
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

	for (const toolCall of toolCalls) {
		yield* runToolCall(toolMap.get(toolCall.name), toolCall);
	}
}
