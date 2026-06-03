import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { resolveAbs } from './shared/common';
import { commandResult, limitNumber, runProcess } from './shared/exec-spawn';

export const runShellTool: AgentTool<{
	command: string;
	cwd?: string;
	timeoutMs?: number;
	maxOutputBytes?: number;
}> = {
	name: 'run_shell',
	description: 'Run a shell command in the workspace with captured output.',
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
