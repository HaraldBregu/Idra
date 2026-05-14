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
	warning?: string;
}

function renderApprovalQuestion(name: string, args: unknown): string {
	let preview = '';
	if (args && typeof args === 'object') {
		const obj = args as Record<string, unknown>;
		if (typeof obj.command === 'string') preview = ` with command: ${obj.command}`;
		else if (typeof obj.path === 'string') preview = ` with path: ${obj.path}`;
	}
	return `Approve tool '${name}'${preview}?`;
}

/**
 * Pre-flight: loop detection + approval gate. Returns whether the agent
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
		if (!ctx.approvalCache.has(key)) {
			const question = renderApprovalQuestion(tool.name, args);
			const approved = ctx.approveStream
				? await ctx.approveStream.ask(question, args, tool.name)
				: false;
			if (!approved) {
				return {
					proceed: false,
					vetoResult: {
						status: 'error',
						content: [{ type: 'text', text: `User denied approval for ${tool.name}.` }],
					},
				};
			}
			ctx.approvalCache.add(key);
		}
	}

	const warning =
		count >= LOOP_WARN_AT
			? `note: this is the ${count}th identical call to ${tool.name}; consider a different approach.`
			: undefined;
	return { proceed: true, warning };
}
