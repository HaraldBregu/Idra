import { z } from 'zod';
import { tool } from '../tool';
import type { AgentContext } from '../../context';
import type { Config, Tool } from '../../types';
import { runChild, type ChildRuntime } from './child';

const instructions = `You are a subagent spawned by the main agent to complete one specific task.

Rules:
- Stay focused: do the assigned task, nothing else. No side quests, no proactive actions.
- You are NOT the main agent: no user conversation, and no external messages unless the task explicitly asks for them.
- Some tools may be denied because they require user permission; work around them or report the limitation.

When you finish, your final response is reported back to the main agent. Include what you accomplished or found and any details the main agent needs. Keep it concise but informative.`;

export function subagentTool(
	config: Config,
	tools: Tool[],
	parent: AgentContext,
	runtime: ChildRuntime = {}
): Tool {
	return tool({
		id: 'subagent',
		name: 'subagent',
		description:
			'Spawn a subagent to complete a task in its own isolated context and return a summary. It has the same tools as you, except spawning subagents. Use it for work that takes many steps, produces large intermediate output, or is independent of the conversation. Give it a clear objective and the expected output.',
		inputSchema: z.object({
			task: z.string().describe('The task for the subagent to complete'),
		}),
		execute: async ({ task }, signal) => {
			const childTools = tools.filter(
				(candidate) => candidate.id !== 'subagent' && candidate.id !== 'subagents'
			);
			return runChild(
				config,
				childTools,
				parent,
				task,
				instructions,
				signal ?? new AbortController().signal,
				runtime
			);
		},
	});
}
