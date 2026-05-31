import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

export const requestClarificationTool: AgentTool<{ question: string }> = {
	name: 'request_clarification',
	description: toolDescription('request_clarification'),
	schema: {
		type: 'object',
		properties: {
			question: { type: 'string' },
		},
		required: ['question'],
		additionalProperties: false,
	},
	async execute(args) {
		return textResult(`clarification requested: ${args.question}`);
	},
};
