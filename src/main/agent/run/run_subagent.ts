import { getModelId, getProvider } from '../settings/settings_store';
import { resolveToolPermission } from '../permissions';
import { addSkillPrompt } from '../system';
import { runModelTurn } from './run_model_turn';
import { formatToolOutput } from './run_common';
import type { Message, MessageContentBlock, RuntimeInput, Tool } from '../types';

const maxIterations = 20;

const instructions = `You are a subagent spawned by the main agent to complete one specific task.

Rules:
- Stay focused: do the assigned task, nothing else. No side quests, no proactive actions.
- You are NOT the main agent: no user conversation, and no external messages unless the task explicitly asks for them.
- Some tools may be denied because they require user permission; work around them or report the limitation.

When you finish, your final response is reported back to the main agent. Include what you accomplished or found and any details the main agent needs. Keep it concise but informative.`;

export async function runSubagent(task: string, tools: Tool[]): Promise<string> {
	// ponytail: subagents reuse the main agent's provider/model, add per-subagent model if needed
	const provider = getProvider();
	const modelId = getModelId();
	if (!provider || !modelId)
		throw new Error('Subagent requires a configured provider and model.');

	const signal = new AbortController().signal;
	const systemPrompt = addSkillPrompt(instructions);
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const input: RuntimeInput = { task: 'subagent', message: task };
	// Fresh context: the subagent never sees the main agent's conversation.
	const messages: Message[] = [{ role: 'user', content: task }];

	let text = '';
	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		const generator = runModelTurn(
			input,
			provider,
			modelId,
			systemPrompt,
			messages,
			tools,
			signal,
		);
		let next = await generator.next();
		while (!next.done) next = await generator.next();
		const turn = next.value;
		text = turn.content;

		const contentBlocks: MessageContentBlock[] = [...(turn.providerItems ?? [])];
		if (turn.content || contentBlocks.length === 0)
			contentBlocks.push({ type: 'text', text: turn.content });
		messages.push({
			role: 'assistant',
			content: contentBlocks,
			...(turn.toolCalls.length > 0 ? { toolCalls: turn.toolCalls } : {}),
		});

		if (turn.toolCalls.length === 0) return text;

		for (const toolCall of turn.toolCalls) {
			toolCall.result = await execute(toolMap.get(toolCall.name), toolCall.name, toolCall.args);
		}
	}

	return text || 'Subagent stopped: reached max iterations without a final answer.';
}

async function execute(
	tool: Tool | undefined,
	name: string,
	args: Record<string, unknown>,
): Promise<{ content: string; isError?: boolean }> {
	if (!tool) return { content: `Error: unknown tool '${name}'`, isError: true };

	// Subagents cannot prompt the user, so anything short of a stored 'allow' is denied.
	if (resolveToolPermission(name, args) !== 'allow') {
		return {
			content: `Error: tool '${name}' requires user permission, which subagents cannot request.`,
			isError: true,
		};
	}

	try {
		return { content: formatToolOutput(await tool.run(args)) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { content: `Error: tool '${name}' failed: ${message}`, isError: true };
	}
}
