import type { SessionState } from '../session';
import { loadGoal } from './load';
import { saveGoal } from './save';
import type { ThreadGoal } from './types';

export function updateGoal(
	state: SessionState,
	patch: Partial<Pick<ThreadGoal, 'status' | 'budget' | 'budgetReason' | 'completionEvidence'>>,
): ThreadGoal | undefined {
	const current = loadGoal(state);
	if (!current) return undefined;
	const goal = { ...current, ...patch };
	saveGoal(state, goal);
	return goal;
}
