import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';

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
