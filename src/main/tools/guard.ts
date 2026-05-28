import type { AgentTool, AgentToolResult, ToolContext } from './core/types';
import { PolicyService } from '../policy';

const LOOP_WARN_AT = 3;
const LOOP_STOP_AT = 5;
const defaultPolicyService = new PolicyService();

export interface CallTracker {
	counts: Map<string, number>;
}

export function newCallTracker(): CallTracker {
	return { counts: new Map() };
}

export interface BeforeCallOutcome {
	proceed: boolean;
	vetoResult?: AgentToolResult;
	vetoStatus?: 'error' | 'blocked';
	warning?: string;
}

/**
 * Pre-flight check for the legacy tool execution path (ToolService.beforeCall).
 * Combines loop detection and approval enforcement in a single policy evaluation.
 *
 * Note: the newer path (wrapToolWithBeforeToolCall in wrap.ts) separates these
 * concerns — loop detection runs at policy evaluation, approval at hook time.
 * Both designs are intentional; guard.ts is the simpler path without hook support.
 */
export async function beforeToolCall(
	tool: AgentTool,
	args: unknown,
	ctx: ToolContext,
	tracker: CallTracker
): Promise<BeforeCallOutcome> {
	const policy = ctx.services.policy ?? defaultPolicyService;
	const key = policy.createToolUseKey(tool.name, args);
	const count = (tracker.counts.get(key) ?? 0) + 1;
	tracker.counts.set(key, count);

	let requires = false;
	if (tool.needsApproval === true) requires = true;
	else if (typeof tool.needsApproval === 'function') {
		requires = await tool.needsApproval(args as Record<string, unknown>, ctx);
	}

	const decision = policy.evaluateToolUse({
		toolName: tool.name,
		params: args,
		callCount: count,
		loopWarnAt: LOOP_WARN_AT,
		loopStopAt: LOOP_STOP_AT,
		requiresApproval: requires || (ctx.approvalRequired?.has(tool.name) ?? false),
		approvalCached: ctx.approvalCache?.has(key) ?? false,
	});

	if (decision.outcome === 'deny') {
		return {
			proceed: false,
			vetoStatus: decision.status,
			vetoResult: deniedToolResult(tool.name, decision.status, decision.reason, decision.deniedReason),
		};
	}

	return { proceed: true, warning: decision.warning };
}

function deniedToolResult(
	toolName: string,
	status: 'error' | 'blocked',
	reason: string,
	deniedReason: string
): AgentToolResult {
	return {
		status,
		content: [{ type: 'text', text: reason }],
		details:
			deniedReason === 'approval_required'
				? { reason: deniedReason, toolName }
				: { reason: deniedReason, toolName },
	};
}
