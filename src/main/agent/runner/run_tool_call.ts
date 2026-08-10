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
	type PermissionsSchema,
} from '../permissions';
import { inputFingerprint } from '../permissions/input_fingerprint';
import { redactApprovalInput } from '../permissions/redact_approval_input';
import { formatToolOutput } from './run_common';
import { limitToolOutput } from './run_limit_output';
import type { AgentOrigin } from '../../../shared/agent_types';
import type { KeyedMutex } from '../mutex';
import { directoryPermissionTargets } from '../permissions/directory_permission_targets';

export interface ToolCallSecurityContext {
	runId: string;
	origin: AgentOrigin;
	windowId?: number;
}

export async function* runToolCall(
	tool: Tool | undefined,
	toolCall: ToolCall,
	interactive = true,
	signal?: AbortSignal,
	context?: ToolsContext,
	permissionMode: AgentPermissionMode = 'ask',
	security: ToolCallSecurityContext = { runId: 'internal', origin: 'main' },
	permissions?: PermissionsSchema,
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
	const createsFile = state ? isFileCreation(state) : false;

	yield {
		type: 'tool_call_start',
		toolCallId: toolCall.id,
		toolName: toolCall.name,
		input: canonicalInput,
	};

	let output: unknown;
	let isError: boolean | undefined;
	let permissionOutcome: 'allow' | 'deny' | 'approve' | 'approve_always' | 'reject' | undefined;

	if (!tool) {
		output = `Error: unknown tool '${toolCall.name}'`;
		isError = true;
	} else if ('__unparsed' in toolCall.args) {
		output = `Error: tool '${toolCall.name}' arguments were not valid JSON (likely truncated by the output token limit). Retry with smaller arguments, e.g. write large files in multiple steps.`;
		isError = true;
	} else if (parseError) {
		output = `Error: invalid input for '${toolCall.name}': ${parseError instanceof Error ? parseError.message : String(parseError)}`;
		isError = true;
	} else if (context?.cancelled) {
		output = `Error: cancelled by user`;
		isError = true;
	} else {
		const policyPermission = resolveToolPermission(
			toolCall.name,
			canonicalInput,
			context,
			interactive,
			'ask',
			permissions
		);
		let permission =
			permissionMode === 'bypass' && policyPermission !== 'deny' ? 'allow' : policyPermission;

		if (permission === 'ask' && !interactive) permission = 'deny';

		if (permission === 'ask') {
			const targets = toolApprovalTargets(toolCall.name, canonicalInput, agentLocation());
			const approvalId = crypto.randomUUID();
			const fingerprint = inputFingerprint(canonicalInput);
			const expiresAtMs = Date.now() + 120_000;
			yield {
				type: 'tool_permission_request',
				approvalId,
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: redactApprovalInput(canonicalInput),
				mode: 'ask',
				targets,
				expiresAt: new Date(expiresAtMs).toISOString(),
				origin: security.origin,
				inputFingerprint: fingerprint,
			};
			const decision = await waitForToolPermission(
				{
					approvalId,
					runId: security.runId,
					origin: security.origin,
					toolName: toolCall.name,
					inputFingerprint: fingerprint,
					expiresAtMs,
					...(security.windowId === undefined ? {} : { windowId: security.windowId }),
				},
				signal
			);
			permissionOutcome = decision;
			if (decision === 'approve_always') {
				if (targets.length === 0) {
					const configured = getToolPermission(toolCall.name);
					setToolPermission(toolCall.name, { ...configured, default: 'allow' });
				} else {
					for (const target of targets) addPermissionRule(toolCall.name, 'allow', target);
				}
			}
			permission = decision === 'reject' ? 'deny' : 'allow';
		}
		permissionOutcome ??= permission;

		if (permission === 'deny') {
			output = `Error: permission denied for '${toolCall.name}'`;
			isError = true;
		} else {
			try {
				if (signal?.aborted) throw signal.reason;
				const timeoutController = new AbortController();
				const timeoutTimer = setTimeout(
					() => timeoutController.abort(new DOMException('Tool call timed out.', 'TimeoutError')),
					tool.timeoutMs
				);
				timeoutTimer.unref?.();
				const toolSignal = signal
					? AbortSignal.any([signal, timeoutController.signal])
					: timeoutController.signal;
				const resourceTargets = directoryPermissionTargets(
					tool.id,
					canonicalInput,
					agentLocation()
				);
				const release = resources
					? await resources.acquire(resourceTargets, toolSignal)
					: () => undefined;
				let abort: (() => void) | undefined;
				try {
					const aborted = new Promise<never>((_, reject) => {
						abort = () => reject(toolSignal.reason ?? new Error('Tool call aborted.'));
						toolSignal.addEventListener('abort', abort, { once: true });
					});
					output = await Promise.race([
						Promise.resolve(tool.run(canonicalInput, toolSignal)),
						aborted,
					]);
					output = limitToolOutput(output, tool.maxOutputBytes);
					if (toolCall.name === 'read_file' && state) rememberTool(context, state);
					if (createsFile && state) rememberTool(context, state);
				} finally {
					release();
					clearTimeout(timeoutTimer);
					if (abort) toolSignal.removeEventListener('abort', abort);
				}
			} catch (error) {
				if (signal?.aborted) throw error;
				const message = error instanceof Error ? error.message : String(error);
				output = `Error: tool '${toolCall.name}' failed: ${message}`;
				isError = true;
			}
			if (context && toolCall.name !== 'search_web' && toolCall.name !== 'fetch_web_page') {
				context.hasPrivateContext = true;
			}
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
		...(permissionOutcome ? { permissionOutcome } : {}),
	};

	toolCall.result = {
		content: formatToolOutput(output),
		isError,
	};
}
