import { readGoal } from './run_goal_read';

export function activeGoalContext(sessionDir: string): string | undefined {
	const goal = readGoal(sessionDir);
	if (goal?.status !== 'active') return undefined;
	const objective = goal.objective.replace(/\s+/g, ' ').trim().slice(0, 200);
	return `Active goal: ${objective} — advance it or update its status (get_goal/update_goal).`;
}
