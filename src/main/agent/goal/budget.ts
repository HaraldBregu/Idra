import type { GoalBudgetReason, ThreadGoal } from './types';

export function goalBudgetReason(goal: ThreadGoal, activeTimeMs = 0): GoalBudgetReason | undefined {
	if (goal.budget.timeoutMs !== undefined && goal.usage.timeUsedMs + activeTimeMs >= goal.budget.timeoutMs)
		return 'timeout';
	if (
		goal.budget.maxTokens !== undefined &&
		goal.usage.inputTokens + goal.usage.outputTokens >= goal.budget.maxTokens
	)
		return 'max_tokens';
	if (goal.usage.toolCalls >= goal.budget.maxToolCalls) return 'max_tool_calls';
	if (goal.usage.iterations >= goal.budget.maxIterations) return 'max_iterations';
	return undefined;
}
