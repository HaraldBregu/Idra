import { exec } from 'node:child_process';
import { z } from 'zod';
import { agentLocation } from '../../shared/agent_location';
import { tool } from '../core/tool';

export const bashTool = tool({
	id: 'bash',
	name: 'Bash',
	description:
		'Execute a shell command in the agent workspace and return its output and exit code.',
	inputSchema: z.object({
		command: z.string().min(1).describe('Shell command to execute.'),
	}),
	execute: ({ command }) =>
		new Promise((resolve) => {
			exec(
				command,
				{ cwd: agentLocation(), timeout: 120_000, maxBuffer: 1_000_000 },
				(error, stdout, stderr) => {
					resolve({
						exitCode: error && 'code' in error && typeof error.code === 'number' ? error.code : 0,
						stdout,
						stderr,
					});
				}
			);
		}),
});
