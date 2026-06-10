import type { Tool } from '../core/tool';
import type { ToolCall } from '../core/types';

export interface ToolOutcome {
	output: unknown;
	isError?: boolean;
}

export async function runTool(
	tool: Tool | undefined,
	toolCall: ToolCall
): Promise<ToolOutcome> {
	if (!tool) {
		return { output: `Error: unknown tool '${toolCall.name}'`, isError: true };
	}

	try {
		return { output: await tool.run(toolCall.args) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { output: `Error: tool '${toolCall.name}' failed: ${message}`, isError: true };
	}
}
