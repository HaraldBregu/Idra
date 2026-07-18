import type { SessionGoal, SessionGoalStatus } from './run_goal_types';
import { readGoal } from './run_goal_read';
import { writeGoal } from './run_goal_write';

export function updateGoalStatus(
	sessionDir: string,
	status: SessionGoalStatus,
	note?: string
): SessionGoal {
	const goal = readGoal(sessionDir);
	if (!goal) throw new Error('No goal set for this session.');
	if (goal.status === 'complete')
		throw new Error('Goal is already complete. Use /goal clear to remove it.');
	const now = Date.now();
	const next: SessionGoal = { ...goal, status, updatedAt: now };
	if (note?.trim()) next.lastStatusNote = note.trim();
	// Resuming a budget-limited (or over-budget) goal resets the budget window.
	if (
		status === 'active' &&
		(goal.status === 'budget_limited' ||
			(goal.tokenBudget !== undefined && goal.tokensUsed >= goal.tokenBudget))
	)
		next.tokensUsed = 0;
	if (status === 'paused') next.pausedAt = now;
	if (status === 'blocked') next.blockedAt = now;
	if (status === 'complete') next.completedAt = now;
	if (status === 'budget_limited') next.budgetLimitedAt = now;
	return writeGoal(sessionDir, next);
}
