import type { RuntimeEvent, Tool, ToolCall } from '../types';
import {
	addToolAllowedCommand,
	addToolAllowedPath,
	recordToolUse,
	resolveToolPermission,
	restrictedToolDir,
	toolCommandName,
	toolTargetDirs,
	waitForToolPermission,
} from '../policy';
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

		if (permission === 'ask' && !interactive) permission = 'deny';

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
				for (const dir of toolTargetDirs(toolCall.name, toolCall.args))
					addToolAllowedPath(toolCall.name, dir);
			}
			permission = decision === 'reject' ? 'deny' : 'allow';
		}

		recordToolUse(toolCall.name, permission);

		if (permission === 'deny') {
			const restricted = restrictedToolDir(toolCall.name, toolCall.args);
			output = restricted
				? `Error: '${restricted}' is a restricted directory; '${toolCall.name}' is not allowed there`
				: `Error: permission denied for '${toolCall.name}'`;
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
