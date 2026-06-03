import path from 'node:path';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { TOOL_LIMITS } from './base/limits';
import {
	DEFAULT_TIMEOUT_MS,
	deniedPattern,
	type ExecDetails,
	isInsidePath,
	runBackground,
	runForeground,
} from './shared/exec-utils';

interface ExecArgs {
	command: string;
	workdir?: string;
	timeoutMs?: number;
	env?: Record<string, string>;
	background?: boolean;
}

export const execTool: AgentTool<ExecArgs, ExecDetails> = {
	name: 'exec',
	description:
		'Run a shell command in the workspace. Output is capped at 200 lines / 16KB. Use for ls, git, build, tests. Use python3 for Python scripts unless the project specifies another command.',
	schema: {
		type: 'object',
		properties: {
			command: { type: 'string', description: 'Shell command to execute.' },
			workdir: { type: 'string', description: 'Working directory (relative or absolute).' },
			timeoutMs: {
				type: 'number',
				description: `Timeout in milliseconds (default ${TOOL_LIMITS.exec.timeoutMs}). Set to 0 to disable the timeout.`,
			},
			env: { type: 'object', description: 'Extra environment variables.' },
			background: {
				type: 'boolean',
				description: 'Start in the background and return a process id.',
			},
		},
		required: ['command'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const command = String(args.command ?? '').trim();
		if (!command) {
			return {
				...textResult('exec: empty command', true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const denied = deniedPattern(command);
		if (denied) {
			return {
				...textResult(`exec: denied by safety policy (pattern: ${denied})`, true),
				details: { exitCode: -1, durationMs: 0, truncated: false },
			};
		}
		const cwd = args.workdir
			? path.isAbsolute(args.workdir)
				? args.workdir
				: path.resolve(ctx.workspace, args.workdir)
			: ctx.workspace;
		if (args.background) return runBackground(command, cwd, args.env);
		const timeoutMs =
			typeof args.timeoutMs === 'number' && Number.isFinite(args.timeoutMs)
				? Math.floor(args.timeoutMs)
				: DEFAULT_TIMEOUT_MS;
		return runForeground(command, cwd, args.env, timeoutMs > 0 ? timeoutMs : null, ctx.signal);
	},
};
