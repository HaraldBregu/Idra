import type { AgentTool } from '../core/types';
import { toolDescription } from '../metadata';
import { resolveAbs } from './path';
import { commandResult, runProcess } from './process';

export const gitStatusTool: AgentTool<{ path?: string }> = {
	name: 'git_status',
	description: toolDescription('git_status'),
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Git work tree path; defaults to workspace.' },
		},
		required: [],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const cwd = args.path ? resolveAbs(ctx.workspace, args.path) : ctx.workspace;
		return commandResult(
			'git_status',
			await runProcess({
				command: 'git',
				args: ['status', '--short', '--branch'],
				cwd,
				shell: false,
				timeoutMs: 30_000,
				maxOutputBytes: 32_768,
				signal: ctx.signal,
			})
		);
	},
};
