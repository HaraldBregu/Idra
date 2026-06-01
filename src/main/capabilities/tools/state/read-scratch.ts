import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { scratchByContext } from './scratch-store';

export const readScratchTool: AgentTool = {
	name: 'read_scratch',
	description: toolDescription('read_scratch'),
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
