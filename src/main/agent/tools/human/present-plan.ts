import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

export const presentPlanTool: AgentTool<{ title?: string; steps: string[] }> = {
	name: 'present_plan',
	description: toolDescription('present_plan'),
	schema: {
		type: 'object',
		properties: {
			title: { type: 'string' },
			steps: { type: 'array', items: { type: 'string' } },
		},
		required: ['steps'],
		additionalProperties: false,
	},
	async execute(args) {
		const title = args.title?.trim() || 'Plan';
		const steps = Array.isArray(args.steps) ? args.steps : [];
		return textResult([title, ...steps.map((step, index) => `${index + 1}. ${step}`)].join('\n'));
	},
};
