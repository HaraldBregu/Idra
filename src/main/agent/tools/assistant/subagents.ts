import { z } from 'zod';
import { KeyedLimiter } from '../../limiter';
import type { AgentContext } from '../../context';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';
import { runChild, type ChildRuntime } from './child';

const instructions = `You are one of several parallel subagents spawned by the main agent to complete one independent research or inspection task.

Rules:
- Stay focused on the assigned task and return only the findings the main agent needs.
- Treat the available tools as read-only. Do not attempt file changes, commands, schedules, persistence, or external actions.
- You are NOT the main agent: do not converse with the user or spawn more agents.`;

const fallbackPool = new KeyedLimiter(3);
const PARALLEL_TOOL_IDS = new Set(['read', 'web_search', 'web_fetch', 'knowledge_query']);

export function subagentsTool(
	config: Config,
	tools: Tool[],
	parent: AgentContext,
	runtime: ChildRuntime = {},
	pool: KeyedLimiter = fallbackPool
): Tool {
	return tool({
		id: 'subagents',
		name: 'subagents',
		description:
			'Spawn two or three independent read-only subagents concurrently. Each task must have a stable id. Results preserve input order, and one failed child does not cancel its siblings.',
		inputSchema: z.object({
			tasks: z
				.array(
					z.object({
						id: z.string().trim().min(1),
						task: z.string().trim().min(1),
					})
				)
				.min(2)
				.max(3),
		}),
		execute: async ({ tasks }, signal) => {
			const parentSignal = signal ?? new AbortController().signal;
			const childTools = tools.filter((candidate) => PARALLEL_TOOL_IDS.has(candidate.id));
			const settled = await Promise.allSettled(
				tasks.map(async ({ task }) => {
					const lease = await pool.acquire('subagents', parentSignal);
					try {
						return await runChild(
							config,
							childTools,
							parent,
							task,
							instructions,
							parentSignal,
							runtime
						);
					} finally {
						lease.release();
					}
				})
			);
			return settled.map((result, index) => ({
				id: tasks[index].id,
				status: result.status,
				text:
					result.status === 'fulfilled'
						? result.value
						: result.reason instanceof Error
							? result.reason.message
							: String(result.reason),
			}));
		},
	});
}
