import type { SessionGoal } from './run_goal_types';

export function formatGoalStatus(goal: SessionGoal | undefined): string {
	if (!goal) return 'No goal set. Start one with /goal start <objective>.';
	const lines = [
		`Goal: ${goal.objective}`,
		`Status: ${goal.status.replace('_', ' ')}`,
		goal.tokenBudget !== undefined
			? `Tokens: ${goal.tokensUsed} used / ${goal.tokenBudget} budget`
			: `Tokens: ${goal.tokensUsed} used`,
	];
	if (goal.lastStatusNote) lines.push(`Note: ${goal.lastStatusNote}`);
	if (goal.status === 'active')
		lines.push(
			'Commands: /goal pause [note], /goal complete [note], /goal block [note], /goal edit <objective>, /goal clear'
		);
	else if (goal.status === 'complete') lines.push('Commands: /goal clear');
	else lines.push('Commands: /goal resume [note], /goal clear');
	return lines.join('\n');
}
