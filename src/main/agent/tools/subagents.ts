import { z } from 'zod';
import { tool } from '../core/tool';
import { runSubagents } from '../subagents/parallel';
import type { SubagentRuntime } from '../subagents/types';

export function subagentsTool(runtime: SubagentRuntime) {
	return tool({
		id: 'subagents',
		name: 'Parallel subagents',
		description: 'Run up to four independent focused tasks concurrently with isolated context.',
		inputSchema: z.object({
			tasks: z
				.array(
					z.object({
						id: z.string().min(1).max(64),
						task: z.string().min(1).max(20_000),
						tools: z.array(z.string()).max(10).optional(),
						maxTurns: z.number().int().min(1).max(10).optional(),
					})
				)
				.min(1)
				.max(4)
				.refine(
					(tasks) => new Set(tasks.map((task) => task.id)).size === tasks.length,
					'Task IDs must be unique.'
				),
		}),
		execute: ({ tasks }, signal) =>
			runSubagents(runtime, tasks, signal ?? new AbortController().signal),
	});
}
