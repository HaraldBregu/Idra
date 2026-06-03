import { objectSchema, type RequestedTool } from './shared';

export const createGoalTool = {
	name: 'functions.create_goal',
	description: 'Creates a new active thread goal only when explicitly requested and no goal already exists.',
	schema: objectSchema({
		objective: { type: 'string' },
		token_budget: { type: 'number' },
	}, ['objective']),
} as const satisfies RequestedTool;
