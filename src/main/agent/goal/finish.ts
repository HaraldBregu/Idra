import type { SessionState } from '../session';
import { loadGoal } from './load';
import { saveGoal } from './save';

export function finishGoalTurn(state: SessionState, elapsedMs: number): void {
	const goal = loadGoal(state);
	if (!goal) return;
	goal.usage.iterations += 1;
	goal.usage.timeUsedMs += elapsedMs;
	saveGoal(state, goal);
}
