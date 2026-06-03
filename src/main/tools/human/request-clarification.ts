import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';

export const requestClarificationTool: AgentTool<{ question: string }> = {
	name: 'request_clarification',
	description: 'Ask a focused clarification question before continuing.',
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
