import type { RuntimeEvent, Tool, ToolCall } from '../types';
import {
	addPermissionRule,
	resolveToolPermission,
	toolRuleSignature,
	waitForToolPermission,
} from '../policy';
import { formatToolOutput } from './run_common';

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall,
	interactive = true,
	signal?: AbortSignal,
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
				const signature = toolRuleSignature(toolCall.name, toolCall.args);
				if (signature) addPermissionRule('allow', signature);
			}
			permission = decision === 'reject' ? 'deny' : 'allow';
		}

		if (permission === 'deny') {
			output = `Error: permission denied for '${toolCall.name}'`;
			isError = true;
		} else {
			try {
				if (signal?.aborted) throw signal.reason;
				let abort: ((reason?: unknown) => void) | undefined;
				const aborted = new Promise<never>((_, reject) => {
					abort = () => reject(signal?.reason ?? new Error('Tool call aborted.'));
					signal?.addEventListener('abort', abort, { once: true });
				});
				try {
					output = await (signal
						? Promise.race([Promise.resolve(tool.run(toolCall.args, signal)), aborted])
						: tool.run(toolCall.args));
				} finally {
					if (abort) signal?.removeEventListener('abort', abort);
				}
			} catch (error) {
				if (signal?.aborted) throw error;
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
