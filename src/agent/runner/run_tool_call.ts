import { agentLocation } from '../../shared/agent_location';
import type { AgentInteractionMode } from '../../shared/agent_types';
import type { FileAccessContext } from '../context';
import { fileToolState, isFileCreation, rememberTool } from '../context';
import type { KeyedMutex } from '../mutex';
import type { RuntimeEvent, Tool, ToolCall } from '../types';
import { formatToolOutput } from './run_common';
import { limitToolOutput } from './run_limit_output';

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
			const timeoutController = new AbortController();
			const timeout = setTimeout(
				() => timeoutController.abort(new DOMException('Tool call timed out.', 'TimeoutError')),
				tool.timeoutMs
			);
			timeout.unref?.();
			const toolSignal = signal
				? AbortSignal.any([signal, timeoutController.signal])
				: timeoutController.signal;
			release = resources ? await resources.acquire([], toolSignal) : release;
			try {
				output = await tool.run(canonicalInput, toolSignal);
				output = limitToolOutput(output, tool.maxOutputBytes);
				if (state && (toolCall.name === 'read_file' || isFileCreation(state))) {
					rememberTool(context, state);
				}
			} finally {
				clearTimeout(timeout);
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
