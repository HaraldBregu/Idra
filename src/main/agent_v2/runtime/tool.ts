import type { RuntimeTool, RuntimeToolCall } from '../types';

/**
 * Result of one tool execution after runtime normalization.
 *
 * Tool failures are represented as output text instead of thrown errors so the
 * next model turn can observe the failure and decide how to continue.
 */
export interface ToolOutcome {
	output: unknown;
	isError?: boolean;
}

/**
 * Executes one model-requested tool call.
 *
 * Unknown tools and thrown exceptions are converted into error output. This keeps
 * the agent loop moving and gives the model a concrete tool result message
 * rather than interrupting the whole run.
 */
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
