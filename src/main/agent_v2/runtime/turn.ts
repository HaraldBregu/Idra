// Collects one streamed model response into text, tool calls, stop reason, and usage.
import { parseToolArgs } from './shared/args';
import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeMessage,
	RuntimeModel,
	RuntimeToolCall,
} from './types';

export interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: Required<RuntimeToolCall>[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

export async function* runModelTurn(
	modelPort: RuntimeModel,
	input: RuntimeInput,
	messages: RuntimeMessage[],
	signal: AbortSignal,
	isStopped: () => boolean
): AsyncGenerator<RuntimeEvent, ModelTurn | null> {
	for (let attempt = 0; attempt <= (input.maxRetries ?? 1); attempt += 1) {
		let content = '';
		let model = input.model ?? 'default';
		let stopReason: string | undefined;
		let usage: ModelTurn['usage'];
		const pending = new Map<string, { name: string; argsText: string }>();

		try {
			for await (const event of modelPort.stream({
				provider: input.provider,
				model,
				system: input.system,
				messages,
				tools: input.tools ?? [],
				maxTokens: input.maxTokens ?? 4096,
				signal,
			})) {
				if (isStopped()) return null;
				if (event.type === 'model_call_delta') content += event.delta;
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
				toolCalls: [...pending].map(([id, toolCall]) => ({
					id,
					name: toolCall.name,
					args: parseToolArgs(toolCall.argsText),
				})),
			};
		} catch (error) {
			if (isStopped()) return null;
			if (attempt >= (input.maxRetries ?? 1)) throw error;
		}
	}

	return { content: '', model: input.model ?? 'default', toolCalls: [] };
}
