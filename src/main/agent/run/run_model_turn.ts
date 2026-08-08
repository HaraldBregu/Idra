import { LlmContextOverflowError, LlmModel } from '../../models/adapters/llm';
import type { LlmEvent, LlmRequest } from '../../models/adapters/llm';
import { parseToolArgs } from '../../shared/parse_tool_args';
import type { ResolvedProvider } from '../../../shared/provider_types';
import type { Message, MessageContentBlock, RuntimeEvent, RuntimeInput, Tool } from '../types';
import type { ModelTurn } from './run_loop_types';
import { setTimeout as wait } from 'node:timers/promises';
import { isTransientModelError } from './run_is_transient_model_error';
import { modelOutputLimit } from './run_model_output_limit';

export interface ModelTurnStream {
	stream(request: LlmRequest): AsyncIterable<LlmEvent>;
}

const llmModel = new LlmModel();

export async function* runModelTurn(
	input: RuntimeInput,
	provider: ResolvedProvider,
	modelId: string,
	systemPrompt: string | undefined,
	messages: Message[],
	tools: Tool[],
	signal: AbortSignal,
	modelOptions: Record<string, unknown> = {},
	llm: ModelTurnStream = llmModel
): AsyncGenerator<RuntimeEvent, ModelTurn> {
	const maxRetries = 1;
	for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
		let visibleOutput = false;
		let content = '';
		let model = modelId;
		let stopReason: string | undefined;
		let usage: ModelTurn['usage'];
		const providerItems: MessageContentBlock[] = [];
		const pending = new Map<string, { name: string; argsText: string }>();

		const maxTokens = modelOutputLimit(provider.id, modelId, modelOptions);
		try {
			for await (const event of llm.stream({
				provider,
				model,
				effort: input.effort,
				systemPrompt,
				messages,
				tools,
				maxTokens,
				options: modelOptions,
				signal,
			})) {
				if (
					event.type === 'model_call_delta' ||
					event.type === 'model_tool_call_start' ||
					event.type === 'model_tool_call_args_delta'
				) visibleOutput = true;
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
			if (
				signal.aborted ||
				error instanceof LlmContextOverflowError ||
				visibleOutput ||
				!isTransientModelError(error) ||
				attempt >= maxRetries
			) throw error;
			await wait(250 * 2 ** attempt, undefined, { signal });
		}
	}

	return { content: '', model: modelId, toolCalls: [] };
}
