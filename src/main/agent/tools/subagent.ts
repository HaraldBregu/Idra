import { z } from 'zod';
import { tool } from './tool';
import { createSessionState } from '../session';
import { adoptSubagent, type AgentContext } from '../context';
import { stream } from '../run/run_stream';
import type { AgentPermissionMode } from '../../../shared/agent_types';
import type { Config, RuntimeInput, Tool } from '../types';

const instructions = `You are a subagent spawned by the main agent to complete one specific task.

Rules:
- Stay focused: do the assigned task, nothing else. No side quests, no proactive actions.
- You are NOT the main agent: no user conversation, and no external messages unless the task explicitly asks for them.
- Some tools may be denied because they require user permission; work around them or report the limitation.

When you finish, your final response is reported back to the main agent. Include what you accomplished or found and any details the main agent needs. Keep it concise but informative.`;

export function subagentTool(config: Config, tools: Tool[], parent: AgentContext): Tool {
	return tool({
		name: 'subagent',
		description:
			'Spawn a subagent to complete a task in its own isolated context and return a summary. It has the same tools as you, except spawning subagents. Use it for work that takes many steps, produces large intermediate output, or is independent of the conversation. Give it a clear objective and the expected output.',
		inputSchema: z.object({
			task: z.string().describe('The task for the subagent to complete'),
			permissionMode: z
				.enum(['ask', 'bypass'])
				.optional()
				.describe('Overrides the stored policy mode for this background subagent.'),
			systemPrompt: z
				.string()
				.optional()
				.describe(
					'Additional system instructions for the subagent. Mandatory subagent rules are always retained.'
				),
		}),
		execute: async ({ task, permissionMode, systemPrompt }) => {
			const input: RuntimeInput = { task: 'subagent', message: task };
			// Fresh context: the subagent never sees the main agent's conversation.
			const session = createSessionState();
			session.messages = [{ role: 'user', content: task }];
			session.context.basePrompt = systemPrompt?.trim()
				? `${systemPrompt.trim()}\n\n${instructions}`
				: instructions;
			adoptSubagent(parent, session.context);

			let text = '';
			const events = stream(config, session, input, new AbortController().signal, {
				tools,
				interactive: false,
				...(permissionMode ? { permissionMode: permissionMode as AgentPermissionMode } : {}),
			});
			for await (const event of events) {
				if (event.type === 'assistant_message') text = event.content;
				if (event.type === 'run_finished' && event.result.subtype === 'error_max_turns')
					text = text || 'Subagent stopped: reached max iterations without a final answer.';
			}
			return text;
		},
	});
}
