import type { RuntimeEvent, ToolCall } from '../core/types';
import type { Tool } from '../core/tool';
import { formatToolOutput } from '../shared/format';

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall
): AsyncGenerator<RuntimeEvent, void> {
	const startedAtMs = Date.now();

	yield {
		type: 'tool_call_start',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: toolCall.args,
	};

	let output: unknown;
	let isError: boolean | undefined;
	let rejected = false;

	const allowed = requestPermission ? await requestPermission(toolCall) : true;

	if (!allowed) {
		output = `Tool '${toolCall.name}' was denied by the user.`;
		isError = true;
		rejected = true;
	} else if (!tool) {
		output = `Error: unknown tool '${toolCall.name}'`;
		isError = true;
	} else {
		try {
			output = await tool.run(toolCall.args);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			output = `Error: tool '${toolCall.name}' failed: ${message}`;
			isError = true;
		}
	}

	yield {
		type: 'tool_call_end',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: toolCall.args,
		output,
		isError,
		rejected,
		durationMs: Date.now() - startedAtMs,
	};

	toolCall.result = {
		content: formatToolOutput(output),
		isError,
	};
}
