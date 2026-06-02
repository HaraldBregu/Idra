import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { scratchByContext } from './scratch-store';

export const writeScratchTool: AgentTool<{ content: string; append?: boolean }> = {
	name: 'write_scratch',
	description: toolDescription('write_scratch'),
	schema: {
		type: 'object',
		properties: {
			content: { type: 'string' },
			append: { type: 'boolean' },
		},
		required: ['content'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const current = scratchByContext.get(ctx) ?? '';
		const next = args.append && current ? `${current}\n${args.content}` : args.content;
		scratchByContext.set(ctx, next);
		return textResult(`scratch updated (${next.length} chars)`);
	},
};
