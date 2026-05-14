import type { AgentTool, PlanEntry } from './types';
import { textResult } from './types';

export const updatePlanTool: AgentTool<{ plan: PlanEntry[] }> = {
	name: 'update_plan',
	description: 'Replace the current task plan with pending, in_progress, or done entries.',
	schema: {
		type: 'object',
		properties: {
			plan: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						task: { type: 'string' },
						status: { type: 'string', enum: ['pending', 'in_progress', 'done'] },
					},
					required: ['task', 'status'],
					additionalProperties: false,
				},
			},
		},
		required: ['plan'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		ctx.plan.entries = args.plan;
		return { ...textResult('plan updated'), details: { plan: args.plan } };
	},
};
