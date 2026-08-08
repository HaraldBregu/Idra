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
import { inputFingerprint } from '../policy/policy_fingerprint';
import { redactApprovalInput } from '../policy/policy_redact_input';
import { formatToolOutput } from './run_common';
import { limitToolOutput } from './run_limit_output';
import type { AgentOrigin } from '../../../shared/agent_types';

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
	security: ToolCallSecurityContext = { runId: 'internal', origin: 'main' }
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
			tool.defaultPermission
		);
		let permission =
			permissionMode === 'bypass' && policyPermission !== 'deny' ? 'allow' : policyPermission;

		const carriesPrivateContext =
			(tool.effect === 'external' || tool.effect === 'paid') && context?.hasPrivateContext === true;
		const hardApproval =
			(typeof tool.hardApproval === 'function'
				? tool.hardApproval(canonicalInput)
				: tool.hardApproval === true) ||
			tool.alwaysAsk === true ||
			carriesPrivateContext;
		if (permission !== 'deny' && (hardApproval || (tool.alwaysAsk && permissionMode !== 'bypass')))
			permission = 'ask';
		if (permission === 'ask' && !interactive) permission = 'deny';

		if (permission === 'ask') {
			const detail = tool.confirmDetail?.(canonicalInput);
			const targets =
				tool.targets?.(canonicalInput) ??
				toolApprovalTargets(toolCall.name, canonicalInput, agentLocation());
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
				risk: tool.risk,
				effect: tool.effect,
				targets,
				hardApproval,
				expiresAt: new Date(expiresAtMs).toISOString(),
				origin: security.origin,
				inputFingerprint: fingerprint,
				...(detail ? { detail } : {}),
			};
			const decision = await waitForToolPermission(
				{
					approvalId,
					runId: security.runId,
					origin: security.origin,
					toolName: toolCall.name,
					inputFingerprint: fingerprint,
					expiresAtMs,
					hardApproval,
					...(security.windowId === undefined ? {} : { windowId: security.windowId }),
				},
				signal
			);
			permissionOutcome = decision;
			if (decision === 'reject' && tool.stopOnReject && context) context.cancelled = true;
			if (decision === 'approve_always' && !hardApproval) {
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
				let abort: ((reason?: unknown) => void) | undefined;
				const aborted = new Promise<never>((_, reject) => {
					abort = () => reject(toolSignal.reason ?? new Error('Tool call aborted.'));
					toolSignal.addEventListener('abort', abort, { once: true });
				});
				try {
					output = await Promise.race([
						Promise.resolve(tool.run(canonicalInput, toolSignal)),
						aborted,
					]);
					output = limitToolOutput(output, tool.maxOutputBytes);
					if (toolCall.name === 'read' && state) rememberTool(context, state);
					if (createsFile && state) rememberTool(context, state);
				} finally {
					clearTimeout(timeoutTimer);
					if (abort) toolSignal.removeEventListener('abort', abort);
				}
			} catch (error) {
				if (signal?.aborted) throw error;
				const message = error instanceof Error ? error.message : String(error);
				output = `Error: tool '${toolCall.name}' failed: ${message}`;
				isError = true;
			}
			if (context && toolCall.name !== 'web_search' && toolCall.name !== 'web_fetch') {
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
