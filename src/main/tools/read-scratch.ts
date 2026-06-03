import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { scratchByContext } from './shared/scratch-store';

export const readScratchTool: AgentTool = {
	name: 'read_scratch',
	description: 'Read run-local scratch notes.',
	schema: {
		type: 'object',
		properties: {},
		required: [],
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		return textResult(scratchByContext.get(ctx) || '(empty)');
	},
};
