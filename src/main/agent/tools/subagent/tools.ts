import type { AgentTool } from '../types';
import { textResult } from '../types';

export const spawnSubagentTool: AgentTool = {
	name: 'spawn_subagent',
	description: 'Spawn a detached subagent task.',
	schema: { type: 'object', required: ['task'], properties: { task: { type: 'string' } } },
	async execute(args, ctx) {
		const subagents = (ctx.services as { subagents?: { spawn?: (input: unknown) => Promise<unknown> } }).subagents;
		if (!subagents?.spawn) return textResult('Subagent service is unavailable.', true);
		return textResult(JSON.stringify(await subagents.spawn(args)));
	},
};
