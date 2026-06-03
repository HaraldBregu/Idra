import { objectSchema, type RequestedTool } from './shared';

export const updateGoalTool = {
	name: 'functions.update_goal',
	description: 'Marks an existing goal as complete or blocked under strict rules.',
	schema: objectSchema({ status: { type: 'string', enum: ['complete', 'blocked'] } }, ['status']),
} as const satisfies RequestedTool;
