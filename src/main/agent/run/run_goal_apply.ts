import type { GoalCommand } from './run_goal_parse';
import { clearGoal } from './run_goal_clear';
import { createGoal } from './run_goal_create';
import { formatGoalStatus } from './run_goal_format';
import { readGoal } from './run_goal_read';
import { updateGoalObjective } from './run_goal_update_objective';
import { updateGoalStatus } from './run_goal_update_status';

export type GoalCommandOutcome = { reply: string } | { continuation: string };

export function applyGoalCommand(sessionDir: string, command: GoalCommand): GoalCommandOutcome {
	try {
		switch (command.action) {
			case 'start':
				return { continuation: createGoal(sessionDir, command.text).objective };
			case 'edit':
				return { reply: formatGoalStatus(updateGoalObjective(sessionDir, command.text)) };
			case 'pause':
				return { reply: formatGoalStatus(updateGoalStatus(sessionDir, 'paused', command.note)) };
			case 'resume': {
				const goal = updateGoalStatus(sessionDir, 'active', command.note);
				return {
					continuation: `Continue pursuing the current goal: ${goal.objective}${
						command.note ? `\n\nNote: ${command.note}` : ''
					}`,
				};
			}
			case 'complete':
				return { reply: formatGoalStatus(updateGoalStatus(sessionDir, 'complete', command.note)) };
			case 'block':
				return { reply: formatGoalStatus(updateGoalStatus(sessionDir, 'blocked', command.note)) };
			case 'clear':
				clearGoal(sessionDir);
				return { reply: 'Goal cleared.' };
			default:
				return { reply: formatGoalStatus(readGoal(sessionDir)) };
		}
	} catch (error) {
		return { reply: error instanceof Error ? error.message : String(error) };
	}
}
