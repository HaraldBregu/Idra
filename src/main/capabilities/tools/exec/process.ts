import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { BACKGROUND_PROCESSES, truncate } from './utils';

export const processTool: AgentTool<{ action: 'list' | 'log' | 'kill'; id?: string }> = {
	name: 'process',
	description:
		'List, inspect logs for, or kill background processes started with exec background=true.',
	schema: {
		type: 'object',
		properties: {
			action: { type: 'string', enum: ['list', 'log', 'kill'] },
			id: { type: 'string' },
		},
		required: ['action'],
		additionalProperties: false,
	},
	async execute(args) {
		if (args.action === 'list') {
			const rows = [...BACKGROUND_PROCESSES.entries()].map(([id, process]) => ({
				id,
				command: process.command,
				startedAt: process.startedAt,
				exited: process.exited,
			}));
			return textResult(rows.length ? JSON.stringify(rows, null, 2) : 'No background processes.');
		}
		if (!args.id) return textResult('process: id is required', true);
		const record = BACKGROUND_PROCESSES.get(args.id);
		if (!record) return textResult(`process: unknown id ${args.id}`, true);
		if (args.action === 'log') return textResult(truncate(record.logs).text || '(no output)');
		record.child.kill('SIGTERM');
		BACKGROUND_PROCESSES.delete(args.id);
		return textResult(`killed process ${args.id}`);
	},
};
