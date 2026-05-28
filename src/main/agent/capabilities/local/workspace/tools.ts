import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentTool } from '../types';
import { textResult } from '../types';

const execFileAsync = promisify(execFile);

export const runShellTool: AgentTool = {
	name: 'run_command',
	description: 'Run a command in the workspace.',
	schema: {
		type: 'object',
		required: ['cmd'],
		properties: {
			cmd: { type: 'string' },
			args: { type: 'array', items: { type: 'string' } },
		},
	},
	needsApproval: true,
	async execute(args, ctx) {
		if (typeof args.cmd !== 'string') throw new Error('cmd is required.');
		const argv = Array.isArray(args.args) ? args.args.map(String) : [];
		const result = await execFileAsync(args.cmd, argv, {
			cwd: ctx.workspace,
			signal: ctx.signal,
			maxBuffer: 1024 * 1024,
		});
		return textResult([result.stdout, result.stderr].filter(Boolean).join('\n'));
	},
};
