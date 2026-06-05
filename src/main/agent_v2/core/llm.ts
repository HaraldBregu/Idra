import type { ProviderAdapter, TranscriptEntry, Usage } from '../../llm/client';
import type { CoreMessage, CoreRequest, CoreResponse, StatelessLlm } from './types';

export class LlmServiceCore implements StatelessLlm {
	constructor(private readonly provider: ProviderAdapter) {}

	async generate(request: CoreRequest): Promise<CoreResponse> {
		let content = '';
		let stopReason: string | undefined;
		let usage: Usage | undefined;

		for await (const event of this.provider.stream({
			model: request.model,
			system: request.system ?? '',
			messages: request.messages.map(toTranscriptEntry),
			tools: [],
			maxTokens: request.maxTokens,
			signal: request.signal,
		})) {
			if (event.type === 'text_delta') {
				content += event.text;
			}
			if (event.type === 'message_end') {
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
}

function toTranscriptEntry(message: CoreMessage): TranscriptEntry {
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
