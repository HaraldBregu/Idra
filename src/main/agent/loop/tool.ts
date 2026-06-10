import type { RuntimeTool, RuntimeToolCall } from '../types';

export interface ToolOutcome {
	output: unknown;
	isError?: boolean;
}

export async function runTool(
	tool: RuntimeTool | undefined,
	toolCall: RuntimeToolCall
): Promise<ToolOutcome> {
	if (!tool?.run) {
		return { output: `Error: unknown tool '${toolCall.name}'`, isError: true };
	}

	try {
		return { output: await tool.run(toolCall.args) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { output: `Error: tool '${toolCall.name}' failed: ${message}`, isError: true };
	}
}
