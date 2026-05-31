import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { resolveAbs } from './path';
import { commandResult, runProcess } from './process';

export const gitDiffTool: AgentTool<{ path?: string; staged?: boolean; stat?: boolean }> = {
	name: 'git_diff',
	description: toolDescription('git_diff'),
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Optional file or directory path.' },
			staged: { type: 'boolean' },
			stat: { type: 'boolean' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const target = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
		const commandArgs = ['diff'];
		if (args.staged) commandArgs.push('--staged');
		if (args.stat) commandArgs.push('--stat');
		if (args.path) commandArgs.push('--', target);
		return commandResult(
			'git_diff',
			await runProcess({
				command: 'git',
				args: commandArgs,
				cwd: ctx.workspace,
				shell: false,
				timeoutMs: 30_000,
				maxOutputBytes: 131_072,
				signal: ctx.signal,
			})
		);
	},
};
