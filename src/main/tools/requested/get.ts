import { objectSchema, type RequestedTool } from './shared';

export const getGoalTool = {
	name: 'functions.get_goal',
	description: 'Gets the current thread goal, status, budgets, usage, and remaining budget.',
	schema: objectSchema(),
} as const satisfies RequestedTool;
