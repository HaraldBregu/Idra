import type { AgentTool } from '../../core/tool';
import { textResult } from '../../core/tool';
import { scratchByContext } from '../shared/scratch-store';

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
