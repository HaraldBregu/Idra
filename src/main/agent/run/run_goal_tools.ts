import { z } from 'zod';
import { tool } from '../tools/tool';
import type { Tool } from '../types';
import { MODEL_UPDATABLE_GOAL_STATUSES } from './run_goal_types';
import { createGoal } from './run_goal_create';
import { readGoal } from './run_goal_read';
import { updateGoalStatus } from './run_goal_update_status';

export function goalTools(sessionDir: string): Tool[] {
	return [
		tool({
			name: 'get_goal',
			description:
				'Read the current session goal: objective, status, token usage, and budget. Read-only.',
			defaultPermission: 'allow',
			inputSchema: z.object({}),
			execute: () => readGoal(sessionDir) ?? { goal: null, message: 'No goal set for this session.' },
		}),
		tool({
			name: 'create_goal',
			description:
				'Create the session goal. Only create one when the user or system explicitly asks for a goal. Fails if a goal already exists; only the user can clear it (/goal clear).',
			defaultPermission: 'allow',
			inputSchema: z.object({
				objective: z.string().describe('The goal objective'),
				token_budget: z
					.number()
					.int()
					.positive()
					.optional()
					.describe('Optional token budget cap for the goal'),
			}),
			execute: ({ objective, token_budget }) => createGoal(sessionDir, objective, token_budget),
		}),
		tool({
			name: 'update_goal',
			description:
				"Report the session goal outcome. Set 'complete' only when the objective is achieved. Set 'blocked' only after the same blocker has persisted for 3+ consecutive goal turns. Pausing, resuming, editing, and clearing belong to the user (/goal commands).",
			defaultPermission: 'allow',
			inputSchema: z.object({
				status: z.enum(MODEL_UPDATABLE_GOAL_STATUSES),
				note: z.string().optional().describe('Short status note'),
			}),
			execute: ({ status, note }) => updateGoalStatus(sessionDir, status, note),
		}),
	];
}
