import { agentLocation } from '../../shared/agent_location';
import type { AgentInteractionMode } from '../../shared/agent_types';
import type { FileAccessContext } from '../state';
import { fileToolState, isFileCreation, rememberTool } from '../state';
import type { KeyedMutex } from '../mutex';
import type { RuntimeEvent, Tool, ToolCall } from '../types';
import { formatToolOutput } from './format_tool_output';
import { limitToolOutput } from './limit_tool_output';

const MAX_TOOL_OUTPUT_BYTES = 200_000;

export interface ToolCallSecurityContext {
	runId: string;
	windowId?: number;
	interactionMode?: AgentInteractionMode;
}

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall,
	signal?: AbortSignal,
	context?: FileAccessContext,
	security: ToolCallSecurityContext = { runId: 'internal' },
	resources?: KeyedMutex
): AsyncGenerator<RuntimeEvent, void> {
	const startedAtMs = Date.now();
	let canonicalInput = toolCall.args;
	let parseError: unknown;
	if (tool) {
		try {
			canonicalInput = tool.parseInput(toolCall.args);
			toolCall.args = canonicalInput;
		} catch (error) {
			parseError = error;
		}
	}
	const state = fileToolState(toolCall.name, canonicalInput, agentLocation());

	yield {
		type: 'tool_call_start',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: canonicalInput,
	};

	let output: unknown;
	let isError: boolean | undefined;
	if (!tool) {
		output = `Error: unknown tool '${toolCall.name}'`;
		isError = true;
	} else if ('__unparsed' in toolCall.args) {
		output = `Error: tool '${toolCall.name}' arguments were not valid JSON`;
		isError = true;
	} else if (parseError) {
		output = `Error: invalid input for '${toolCall.name}': ${parseError instanceof Error ? parseError.message : String(parseError)}`;
		isError = true;

	} else {
		let release = (): void => undefined;
		try {
			signal?.throwIfAborted();
			release = resources ? await resources.acquire([], signal) : release;
			output = await tool.run(canonicalInput, signal);
			output = limitToolOutput(output, MAX_TOOL_OUTPUT_BYTES);
			if (state && (toolCall.name === 'read' || isFileCreation(state))) {
				rememberTool(context, state);
			}
		} catch (error) {
			if (signal?.aborted) throw error;
			output = `Error: tool '${toolCall.name}' failed: ${error instanceof Error ? error.message : String(error)}`;
			isError = true;
		} finally {
			release();
		}
	}

	yield {
		type: 'tool_call_end',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: canonicalInput,
		output,
		isError,
		durationMs: Date.now() - startedAtMs,
	};
	toolCall.result = { content: formatToolOutput(output), isError };
}
