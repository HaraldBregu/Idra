import type { ThreadGoal } from './types';

export function addGoalPrompt(prompt: string, goal: ThreadGoal | undefined): string {
	if (!goal || goal.status !== 'active') return prompt;
	return `${prompt}\n\nThis thread has an active user-authored goal. Work toward it using concrete evidence from files, commands, tests, logs, artifacts, or research. Before calling goal_complete, audit the full objective against that evidence. Do not call goal_complete for partial progress, a plausible claim, or because a budget is nearly exhausted. If blocked or user input is required, explain the blocker and stop without completing the goal.`;
}
