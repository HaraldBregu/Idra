import type { SessionState } from '../session';
import { loadGoal } from './load';
import { saveGoal } from './save';
import type { GoalBudget, ThreadGoal } from './types';

export function setGoal(state: SessionState, objective: string, budget: GoalBudget): ThreadGoal {
	const normalized = objective.trim();
	if (!normalized) throw new Error('Goal objective cannot be empty.');
	if (normalized.length > 4000) throw new Error('Goal objective cannot exceed 4,000 characters.');

	const current = loadGoal(state);
	const preserveUsage =
		current?.objective === normalized &&
		(current.status === 'active' ||
			current.status === 'paused' ||
			current.status === 'budget_limited');
	const goal: ThreadGoal = preserveUsage
		? { ...current, status: 'active', budget, budgetReason: undefined }
		: {
				threadId: state.id,
				objective: normalized,
				status: 'active',
				budget,
				usage: {
					iterations: 0,
					toolCalls: 0,
					inputTokens: 0,
					outputTokens: 0,
					timeUsedMs: 0,
				},
			};
	saveGoal(state, goal);
	return goal;
}
