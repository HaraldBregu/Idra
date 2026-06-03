import { objectSchema, type RequestedTool } from './shared';

export const updatePlanTool = {
	name: 'functions.update_plan',
	description: 'Updates a visible task plan with step status and optional explanation.',
	schema: objectSchema({
		explanation: { type: 'string' },
		plan: {
			type: 'array',
			items: objectSchema({
				step: { type: 'string' },
				status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
			}, ['step', 'status']),
		},
	}, ['plan']),
} as const satisfies RequestedTool;
