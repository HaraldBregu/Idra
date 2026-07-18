export type SessionGoalStatus = 'active' | 'paused' | 'blocked' | 'budget_limited' | 'complete';

export const MODEL_UPDATABLE_GOAL_STATUSES = ['complete', 'blocked'] as const;

export interface SessionGoal {
	schemaVersion: 1;
	id: string;
	objective: string;
	status: SessionGoalStatus;
	createdAt: number;
	updatedAt: number;
	tokensUsed: number;
	tokenBudget?: number;
	lastStatusNote?: string;
	pausedAt?: number;
	blockedAt?: number;
	completedAt?: number;
	budgetLimitedAt?: number;
}
