import { z } from 'zod';
import { tool } from './tool';
import type { Tool } from '../types';
import { runSubagent } from '../run/run_subagent';

export function subagentTool(tools: Tool[]): Tool {
	return tool({
		name: 'subagent',
		description:
			'Spawn a subagent to complete a task in its own isolated context and return a summary. It has the same tools as you, except spawning subagents. Use it for work that takes many steps, produces large intermediate output, or is independent of the conversation. Give it a clear objective and the expected output.',
		inputSchema: z.object({
			task: z.string().describe('The task for the subagent to complete'),
		}),
		execute: ({ task }) => runSubagent(task, tools),
	});
}
