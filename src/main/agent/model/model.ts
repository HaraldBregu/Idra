import { LlmService } from '../../llm';
import type { AgentContentBlock, TranscriptEntry } from '../../llm/types';
import { ModelModule } from '../core/model';
import type { ModelEvent, ModelMessage, ModelRequest, ModelResponse } from '../types';

export class AgentModel extends ModelModule {
	private readonly llm = new LlmService();

	async generate(request: ModelRequest): Promise<ModelResponse> {
		let content = '';
		const toolCalls = new Map<string, { name: string; argsText: string }>();
		let stopReason: string | undefined;
		let usage: ModelResponse['usage'];

		for await (const event of this.stream(request)) {
			if (event.type === 'model_call_delta') {
				content += event.delta;
			}
			if (event.type === 'model_tool_call_start') {
				toolCalls.set(event.id, { name: event.name, argsText: '' });
			}
			if (event.type === 'model_tool_call_args_delta') {
				const toolCall = toolCalls.get(event.id);
				if (toolCall) toolCall.argsText += event.jsonDelta;
			}
			if (event.type === 'model_call_end') {
				stopReason = event.stopReason;
				usage = event.usage;
			}
		}

		return {
			content,
			toolCalls: [...toolCalls].map(([id, toolCall]) => ({
				id,
				name: toolCall.name,
				args: parseToolArgs(toolCall.argsText),
			})),
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
			tools: (request.tools ?? []).map((tool) => ({
				name: tool.name,
				description: tool.description ?? '',
				schema: tool.schema ?? { type: 'object', properties: {}, additionalProperties: true },
			})),
			maxTokens: request.maxTokens,
			signal: request.signal,
		})) {
			if (event.type === 'text_delta') {
				yield { type: 'model_call_delta', delta: event.text };
			}
			if (event.type === 'tool_call_start') {
				yield { type: 'model_tool_call_start', id: event.id, name: event.name };
			}
			if (event.type === 'tool_call_args_delta') {
				yield {
					type: 'model_tool_call_args_delta',
					id: event.id,
					jsonDelta: event.jsonDelta,
				};
			}
			if (event.type === 'tool_call_end') {
				yield { type: 'model_tool_call_end', id: event.id };
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

function toTranscriptEntry(message: ModelMessage): TranscriptEntry {
	if (message.role === 'assistant') {
		const content: AgentContentBlock[] = [];
		if (message.content) content.push({ type: 'text', text: message.content });
		for (const toolCall of message.toolCalls ?? []) {
			content.push({
				type: 'tool_use',
				toolUseId: toolCall.id,
				toolName: toolCall.name,
				toolArgs: toolCall.args,
			});
		}
		if (content.length === 0) content.push({ type: 'text', text: '' });
		return { role: 'assistant', content };
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

function parseToolArgs(argsText: string): Record<string, unknown> {
	if (!argsText.trim()) return {};
	try {
		const parsed = JSON.parse(argsText);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return { __parsed: parsed };
	} catch {
		return { __unparsed: argsText };
	}
}
