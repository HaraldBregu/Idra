import type { AgentTool } from '../types';
import { textResult } from '../types';

export const createCronTool: AgentTool = {
	name: 'cron_create',
	description: 'Create a scheduled task through the injected cron service.',
	schema: {
		type: 'object',
		required: ['expression', 'task'],
		properties: { expression: { type: 'string' }, task: { type: 'string' } },
	},
	async execute(args, ctx) {
		const cron = (ctx.services as { cron?: { create?: (...args: unknown[]) => unknown } }).cron;
		if (!cron?.create) return textResult('Cron service is unavailable.', true);
		return textResult(JSON.stringify(await cron.create(args)));
	},
};
