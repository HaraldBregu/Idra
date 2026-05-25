import type { AgentTool, AgentToolResult, ToolContext } from '../core/types';
import { evaluateToolUsePolicy, toolUsePolicyKey } from '../../policy';

const LOOP_WARN_AT = 3;
const LOOP_STOP_AT = 5;

export interface CallTracker {
	counts: Map<string, number>;
}

export function newCallTracker(): CallTracker {
	return { counts: new Map() };
}

export interface BeforeCallOutcome {
	proceed: boolean;
	vetoResult?: AgentToolResult;
	vetoStatus?: 'error' | 'rejected';
	warning?: string;
}

/**
 * Pre-flight: loop detection and approval enforcement. Returns whether the agent
 * loop should proceed with `tool.execute`, and optionally a veto result
 * to feed back to the model in lieu of execution.
 */
export async function beforeToolCall(
	tool: AgentTool,
	args: unknown,
	ctx: ToolContext,
	tracker: CallTracker
): Promise<BeforeCallOutcome> {
	const key = toolUsePolicyKey(tool.name, args);
	const count = (tracker.counts.get(key) ?? 0) + 1;
	tracker.counts.set(key, count);

	let requires = false;
	if (tool.needsApproval === true) requires = true;
	else if (typeof tool.needsApproval === 'function') {
		requires = await tool.needsApproval(args as Record<string, unknown>, ctx);
	}

	const decision = (ctx.services.policy?.evaluateToolUse ?? evaluateToolUsePolicy)({
		toolName: tool.name,
		params: args,
		callCount: count,
		loopWarnAt: LOOP_WARN_AT,
		loopStopAt: LOOP_STOP_AT,
		requiresApproval: requires || ctx.approvalRequired.has(tool.name),
		approvalCached: ctx.approvalCache.has(key),
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
	status: 'error' | 'rejected',
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
