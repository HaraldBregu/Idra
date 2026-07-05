import { getModelId, getProvider } from '../settings/settings_store';
import { runModelTurn } from './run_model_turn';
import { formatToolOutput } from './run_common';
import type { Message, MessageContentBlock, RuntimeInput, Tool } from '../types';

export interface SubagentDefinition {
	name: string;
	description: string;
	instructions: string;
	tools: Tool[];
	maxIterations?: number;
}

export async function runSubagent(definition: SubagentDefinition, task: string): Promise<string> {
	// ponytail: subagents reuse the main agent's provider/model, add per-subagent model if needed
	const provider = getProvider();
	const modelId = getModelId();
	if (!provider || !modelId)
		throw new Error('Subagent requires a configured provider and model.');

	const signal = new AbortController().signal;
	const maxIterations = definition.maxIterations ?? 10;
	const toolMap = new Map(definition.tools.map((tool) => [tool.name, tool]));
	const input: RuntimeInput = { task: 'subagent', message: task };
	// Fresh context: the subagent never sees the main agent's conversation.
	const messages: Message[] = [{ role: 'user', content: task }];

	let text = '';
	for (let iteration = 0; iteration < maxIterations; iteration += 1) {
		const generator = runModelTurn(
			input,
			provider,
			modelId,
			definition.instructions,
			messages,
			definition.tools,
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

		// No permission flow here: subagent tools must be safe to auto-approve.
		for (const toolCall of turn.toolCalls) {
			const tool = toolMap.get(toolCall.name);
			let output: unknown;
			let isError: boolean | undefined;
			if (!tool) {
				output = `Error: unknown tool '${toolCall.name}'`;
				isError = true;
			} else {
				try {
					output = await tool.run(toolCall.args);
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					output = `Error: tool '${toolCall.name}' failed: ${message}`;
					isError = true;
				}
			}
			toolCall.result = { content: formatToolOutput(output), isError };
		}
	}

	return text || 'Subagent stopped: reached max iterations without a final answer.';
}
