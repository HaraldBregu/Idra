import { z } from 'zod';
import type { SessionState } from '../session';
import { tool } from '../tools/tool';
import { loadGoal } from './load';
import { updateGoal } from './update';

export function completeGoalTool(state: SessionState) {
	return tool({
		name: 'goal_complete',
		description:
			'Mark the active thread goal complete after auditing the entire objective against concrete evidence.',
		inputSchema: z.object({
			evidence: z
				.string()
				.min(1)
				.describe('Concise concrete evidence that every part of the goal is complete.'),
		}),
		execute: ({ evidence }) => {
			const goal = loadGoal(state);
			if (!goal || goal.status !== 'active')
				throw new Error('There is no active goal to complete.');
			updateGoal(state, { status: 'complete', completionEvidence: evidence });
			return { status: 'complete', evidence };
		},
	});
}
