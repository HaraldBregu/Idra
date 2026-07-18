import { randomUUID } from 'node:crypto';
import type { SessionGoal } from './run_goal_types';
import { readGoal } from './run_goal_read';
import { writeGoal } from './run_goal_write';

export function createGoal(sessionDir: string, objective: string, tokenBudget?: number): SessionGoal {
	if (readGoal(sessionDir))
		throw new Error('A goal already exists for this session. Clear it first with /goal clear.');
	const trimmed = objective.trim();
	if (!trimmed) throw new Error('Goal objective is required.');
	const now = Date.now();
	return writeGoal(sessionDir, {
		schemaVersion: 1,
		id: randomUUID(),
		objective: trimmed,
		status: 'active',
		createdAt: now,
		updatedAt: now,
		tokensUsed: 0,
		...(tokenBudget && tokenBudget > 0 ? { tokenBudget } : {}),
	});
}
