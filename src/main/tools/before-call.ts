import type { AgentTool, AgentToolResult, ToolContext } from './types';

const LOOP_WARN_AT = 3;
const LOOP_STOP_AT = 5;

export interface CallTracker {
	counts: Map<string, number>;
}

export function newCallTracker(): CallTracker {
	return { counts: new Map() };
}

function callKey(name: string, args: unknown): string {
	return name + '::' + JSON.stringify(args ?? {});
}

export interface BeforeCallOutcome {
	proceed: boolean;
	vetoResult?: AgentToolResult;
	vetoStatus?: 'error' | 'rejected';
	warning?: string;
}

/**
 * Pre-flight: loop detection. Returns whether the agent
 * loop should proceed with `tool.execute`, and optionally a veto result
 * to feed back to the model in lieu of execution.
 */
export async function beforeToolCall(
	tool: AgentTool,
	args: unknown,
	ctx: ToolContext,
	tracker: CallTracker
): Promise<BeforeCallOutcome> {
	const key = callKey(tool.name, args);
	const count = (tracker.counts.get(key) ?? 0) + 1;
	tracker.counts.set(key, count);

	if (count > LOOP_STOP_AT) {
		return {
			proceed: false,
			vetoStatus: 'error',
			vetoResult: {
				status: 'error',
				content: [
					{
						type: 'text',
						text: `loop detector: identical call to ${tool.name} has occurred ${count} times. Stopping. Change approach.`,
					},
				],
			},
		};
	}

	let requires = false;
	if (tool.needsApproval === true) requires = true;
	else if (typeof tool.needsApproval === 'function') {
		requires = await tool.needsApproval(args as Record<string, unknown>, ctx);
	}
	if (requires || ctx.approvalRequired.has(tool.name)) {
		ctx.approvalCache.add(key);
	}

	const warning =
		count >= LOOP_WARN_AT
			? `note: this is the ${count}th identical call to ${tool.name}; consider a different approach.`
			: undefined;
	return { proceed: true, warning };
}
