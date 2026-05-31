import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';
import { resolveAbs } from './path';
import { commandResult, limitNumber, runProcess } from './process';

export const runShellTool: AgentTool<{
	command: string;
	cwd?: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
}> = {
	name: 'run_shell',
	description: toolDescription('run_shell'),
	schema: {
		type: 'object',
		properties: {
			command: { type: 'string' },
			cwd: { type: 'string', description: 'Working directory; defaults to workspace.' },
			timeoutMs: { type: 'number' },
			maxOutputBytes: { type: 'number' },
		},
		required: ['command'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		if (ctx.fsPolicy?.readOnly) {
			return textResult('run_shell: disabled by read-only filesystem policy.', true);
		}
		const command = String(args.command ?? '').trim();
		if (!command) return textResult('run_shell: command is required.', true);
		let cwd: string;
		try {
			cwd = args.cwd ? resolveAbs(ctx.workspace, args.cwd) : ctx.workspace;
		} catch (error) {
			return textResult(`run_shell: ${(error as Error).message}`, true);
		}
		return commandResult(
			'run_shell',
			await runProcess({
				command,
				args: [],
				cwd,
				shell: true,
				timeoutMs: limitNumber(args.timeoutMs, 30_000, 120_000),
				maxOutputBytes: limitNumber(args.maxOutputBytes, 32_768, 131_072),
				signal: ctx.signal,
			})
		);
	},
};
