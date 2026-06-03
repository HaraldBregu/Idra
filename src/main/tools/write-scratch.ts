import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { scratchByContext } from './shared/scratch-store';

export const writeScratchTool: AgentTool<{ content: string; append?: boolean }> = {
	name: 'write_scratch',
	description: 'Write run-local scratch notes for later tool calls.',
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
