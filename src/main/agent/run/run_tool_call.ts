import type { RuntimeEvent, Tool, ToolCall } from '../types';
import { fileToolState, isFileCreation, rememberTool, type ToolsContext } from '../context';
import type { AgentPermissionMode } from '../../../shared/agent_types';
import { agentLocation } from '../../shared/agent_location';
import {
	addPermissionRule,
	getToolPermission,
	resolveToolPermission,
	setToolPermission,
	toolApprovalTargets,
	waitForToolPermission,
} from '../policy';
import { formatToolOutput } from './run_common';

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall,
	interactive = true,
	signal?: AbortSignal,
	context?: ToolsContext,
	permissionMode: AgentPermissionMode = 'ask'
): AsyncGenerator<RuntimeEvent, void> {
	const startedAtMs = Date.now();
	const state = fileToolState(toolCall.name, toolCall.args, agentLocation());
	const createsFile = state ? isFileCreation(state) : false;

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
	} else if ('__unparsed' in toolCall.args) {
		output = `Error: tool '${toolCall.name}' arguments were not valid JSON (likely truncated by the output token limit). Retry with smaller arguments, e.g. write large files in multiple steps.`;
		isError = true;
	} else if (context?.cancelled) {
		output = `Error: cancelled by user`;
		isError = true;
	} else {
		let permission =
			permissionMode === 'bypass'
				? 'allow'
				: resolveToolPermission(
						toolCall.name,
						toolCall.args,
						context,
						interactive,
						tool.defaultPermission
					);

		if (tool.alwaysAsk && permissionMode !== 'bypass') permission = 'ask';
		if (permission === 'ask' && !interactive) permission = 'deny';

		if (permission === 'ask') {
			const detail = tool.confirmDetail?.(toolCall.args);
			yield {
				type: 'tool_permission_request',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: toolCall.args,
				mode: 'ask',
				...(detail ? { detail } : {}),
			};
			const decision = await waitForToolPermission(toolCall.id);
			if (decision !== 'reject' && toolCall.name === 'read' && state) rememberTool(context, state);
			if (decision === 'reject' && tool.stopOnReject && context) context.cancelled = true;
			if (decision === 'approve_always' && !tool.alwaysAsk) {
				const targets = toolApprovalTargets(toolCall.name, toolCall.args, agentLocation());
				if (targets.length === 0) {
					const configured = getToolPermission(toolCall.name);
					setToolPermission(toolCall.name, { ...configured, default: 'allow' });
				} else {
					for (const target of targets) addPermissionRule(toolCall.name, 'allow', target);
				}
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
					if (createsFile && state) rememberTool(context, state);
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
