import { AgentModel } from '../../models/llm';
import type {
	Provider,
	RuntimeEvent,
	RuntimeInput,
	Message,
	MessageContentBlock,
	Tool,
} from '../types';
import { parseToolArgs } from '../../shared/parse_tool_args';
import type { ModelTurn } from './types';

const agentModel = new AgentModel();

export async function* runModelTurn(
	_input: RuntimeInput,
	provider: Provider,
	modelId: string,
	systemPrompt: string | undefined,
	messages: Message[],
	tools: Tool[],
	signal: AbortSignal,
): AsyncGenerator<RuntimeEvent, ModelTurn> {
	const maxRetries = 1;
	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		let content = '';
		let model = modelId;
		let stopReason: string | undefined;
		let usage: ModelTurn['usage'];
		const providerItems: MessageContentBlock[] = [];
		const pending = new Map<string, { name: string; argsText: string }>();

		const maxTokens = 4096;
		try {
			for await (const event of agentModel.stream({
				provider,
				model,
				systemPrompt,
				messages,
				tools,
				maxTokens,
				signal,
			})) {
				if (event.type === 'model_call_delta') content += event.delta;
				if (event.type === 'model_provider_item') {
					providerItems.push({
						type: 'provider_item',
						provider: event.provider,
						item: event.item,
					});
				}
				if (event.type === 'model_tool_call_start') {
					pending.set(event.id, { name: event.name, argsText: '' });
				}
				if (event.type === 'model_tool_call_args_delta') {
					const toolCall = pending.get(event.id);
					if (toolCall) toolCall.argsText += event.jsonDelta;
				}
				if (event.type === 'model_call_end') {
					model = event.model;
					stopReason = event.stopReason;
					usage = event.usage;
				}
				yield event;
			}

			return {
				content,
				model,
				stopReason,
				usage,
				providerItems,
				toolCalls: [...pending].map(([id, toolCall]) => ({
					id,
					name: toolCall.name,
					args: parseToolArgs(toolCall.argsText),
				})),
			};
		} catch (error) {
			if (attempt >= maxRetries) throw error;
		}
	}

	return { content: '', model: modelId, toolCalls: [] };
}
