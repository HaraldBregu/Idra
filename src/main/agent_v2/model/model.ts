import { LlmService } from '../../llm';
import type { ModelEvent, ModelMessage, ModelModule, ModelRequest, ModelResponse } from './types';

type ModelTranscriptEntry =
	| { role: 'user'; content: string }
	| { role: 'assistant'; content: Array<{ type: 'text'; text: string }> }
	| { role: 'tool'; toolUseId: string; content: Array<{ type: 'text'; text: string }> };

export class AgentModel implements ModelModule {
	private readonly llm = new LlmService();

	async generate(request: ModelRequest): Promise<ModelResponse> {
		let content = '';
		let stopReason: string | undefined;
		let usage: ModelResponse['usage'];

		for await (const event of this.stream(request)) {
			if (event.type === 'model_call_delta') {
				content += event.delta;
			}
			if (event.type === 'model_call_end') {
				stopReason = event.stopReason;
				usage = event.usage;
			}
		}

		return {
			content,
			model: request.model,
			stopReason,
			usage,
		};
	}

	async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
		const system = [
			request.system,
			...request.messages
				.filter((message) => message.role === 'system')
				.map((message) => message.content),
		]
			.filter(Boolean)
			.join('\n\n');
		const messages = request.messages.filter((message) => message.role !== 'system');

		yield { type: 'model_call_start', model: request.model };

		for await (const event of this.llm.build(request.provider).stream({
			model: request.model,
			system,
			messages: messages.map(toTranscriptEntry),
			tools: [],
			maxTokens: request.maxTokens,
			signal: request.signal,
		})) {
			if (event.type === 'text_delta') {
				yield { type: 'model_call_delta', delta: event.text };
			}
			if (event.type === 'message_end') {
				yield {
					type: 'model_call_end',
					model: request.model,
					stopReason: event.stopReason,
					usage: event.usage,
				};
			}
		}
	}
}

function toTranscriptEntry(message: ModelMessage): ModelTranscriptEntry {
	if (message.role === 'assistant') {
		return { role: 'assistant', content: [{ type: 'text', text: message.content }] };
	}
	if (message.role === 'tool') {
		return {
			role: 'tool',
			toolUseId: message.toolUseId ?? 'tool',
			content: [{ type: 'text', text: message.content }],
		};
	}
	return { role: 'user', content: message.content };
}
