import type { SessionResult, SessionState } from '../session';
import type { GoalBudgetReason, ThreadGoal } from './types';

export function goalBudgetOutcome(
	state: SessionState,
	goal: ThreadGoal,
	reason: GoalBudgetReason,
): SessionResult {
	const labels: Record<GoalBudgetReason, string> = {
		max_iterations: 'iteration limit',
		max_tool_calls: 'tool-call limit',
		max_tokens: 'token limit',
		timeout: 'time limit',
	};
	return {
		text:
			`Goal paused because its ${labels[reason]} was reached. ` +
			`Progress: ${goal.usage.iterations} completed turn(s), ${goal.usage.toolCalls} tool call(s), ` +
			`${goal.usage.inputTokens + goal.usage.outputTokens} token(s). Raise the goal budget and resume to continue.`,
		model: state.model,
		toolCalls: state.toolCalls,
		numTurns: state.numTurns,
		subtype: 'error_max_turns',
		sessionId: state.id,
		stopReason: reason,
		usage: state.usage,
	};
}
