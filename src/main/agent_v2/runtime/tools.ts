import { formatToolOutput } from './shared/format';
import { runTool } from './tool';
import type {
	RuntimeEvent,
	RuntimeMessage,
	RuntimeTool,
	RuntimeToolCall,
} from './types';

/**
 * Executes the tool calls requested by a single assistant turn.
 *
 * The generator yields start/end events for UI progress and returns the `tool`
 * transcript messages that must be appended before the next model turn.
 */
export async function* runToolCalls(
	tools: RuntimeTool[],
	toolCalls: Required<RuntimeToolCall>[],
	isStopped: () => boolean
): AsyncGenerator<RuntimeEvent, RuntimeMessage[] | null> {
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const results: RuntimeMessage[] = [];

	for (const toolCall of toolCalls) {
		if (isStopped()) return null;

		yield { type: 'tool_call_start', toolName: toolCall.name, input: toolCall.args };
		const outcome = await runTool(toolMap.get(toolCall.name), toolCall);
		yield { type: 'tool_call_end', toolName: toolCall.name, output: outcome.output };

		results.push({
			role: 'tool',
			toolUseId: toolCall.id,
			content: formatToolOutput(outcome.output),
		});
	}

	return results;
}
