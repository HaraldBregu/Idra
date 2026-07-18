import type { SessionGoal } from './run_goal_types';
import { readGoal } from './run_goal_read';
import { writeGoal } from './run_goal_write';

export function accountGoalUsage(sessionDir: string, tokens: number): void {
	if (tokens <= 0) return;
	const goal = readGoal(sessionDir);
	if (!goal || goal.status === 'complete') return;
	const now = Date.now();
	const next: SessionGoal = { ...goal, tokensUsed: goal.tokensUsed + tokens, updatedAt: now };
	if (next.status === 'active' && next.tokenBudget !== undefined && next.tokensUsed >= next.tokenBudget) {
		next.status = 'budget_limited';
		next.budgetLimitedAt = now;
	}
	writeGoal(sessionDir, next);
}
