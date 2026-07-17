export interface GoalBudget {
	maxIterations: number;
	maxToolCalls: number;
	maxTokens?: number;
	timeoutMs?: number;
}

export type GoalStatus = 'active' | 'paused' | 'complete' | 'budget_limited';

export type GoalBudgetReason = 'max_iterations' | 'max_tool_calls' | 'max_tokens' | 'timeout';

export interface GoalUsage {
	iterations: number;
	toolCalls: number;
	inputTokens: number;
	outputTokens: number;
	timeUsedMs: number;
}

export interface ThreadGoal {
	threadId: string;
	objective: string;
	status: GoalStatus;
	budget: GoalBudget;
	usage: GoalUsage;
	budgetReason?: GoalBudgetReason;
	completionEvidence?: string;
}
