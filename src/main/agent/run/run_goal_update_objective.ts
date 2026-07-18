import type { SessionGoal } from './run_goal_types';
import { readGoal } from './run_goal_read';
import { writeGoal } from './run_goal_write';

export function updateGoalObjective(sessionDir: string, objective: string): SessionGoal {
	const goal = readGoal(sessionDir);
	if (!goal) throw new Error('No goal set for this session.');
	const trimmed = objective.trim();
	if (!trimmed) throw new Error('Goal objective is required.');
	return writeGoal(sessionDir, { ...goal, objective: trimmed, updatedAt: Date.now() });
}
