import type { RuntimeEvent, Tool, ToolCall } from '../types';
import {
	addToolAllowedCommand,
	addToolAllowedPath,
	recordToolUse,
	resolveToolPermission,
	toolCommandName,
	toolTargetDirs,
	waitForToolPermission,
} from '../policy';
import { isWithinSandbox } from '../sandbox';
import { formatToolOutput } from './run_common';

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall,
	interactive = true,
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

	if (!tool) {
		output = `Error: unknown tool '${toolCall.name}'`;
		isError = true;
	} else {
		let permission = resolveToolPermission(toolCall.name, toolCall.args);

		if (permission === 'ask') {
			yield {
				type: 'tool_permission_request',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: toolCall.args,
				mode: 'ask',
			};
			const decision = await waitForToolPermission(toolCall.id);
			if (decision === 'approve_always') {
				const command = toolCommandName(toolCall.args);
				if (command) addToolAllowedCommand(toolCall.name, command);
				const dirs = toolTargetDirs(toolCall.name, toolCall.args);
				for (const dir of dirs.filter((d) => !isWithinSandbox(d)))
					addToolAllowedPath(toolCall.name, dir);
			}
			permission = decision === 'reject' ? 'deny' : 'allow';
		}

		recordToolUse(toolCall.name, permission);

		if (permission === 'deny') {
			output = `Error: permission denied for '${toolCall.name}'`;
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
	}

	yield {
		type: 'tool_call_end',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: toolCall.args,
		output,
		isError,
		durationMs: Date.now() - startedAtMs,
	};

	toolCall.result = {
		content: formatToolOutput(output),
		isError,
	};
}
