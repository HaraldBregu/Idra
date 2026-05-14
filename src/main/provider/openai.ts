import OpenAI from 'openai';
import type {
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
	TranscriptEntry,
} from './types';
import { ContextOverflowError, ProviderAuthError } from './types';

function buildChatMessages(
	system: string,
	transcript: TranscriptEntry[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
	const msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
	if (system) msgs.push({ role: 'system', content: system });
	for (const entry of transcript) {
		if (entry.role === 'user') {
			msgs.push({ role: 'user', content: entry.content });
			continue;
		}
		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((b) => b.type === 'text')
				.map((b) => b.text ?? '')
				.join('');
			const tools = entry.content
				.filter((b) => b.type === 'tool_use')
				.map((b) => ({
					id: b.toolUseId!,
					type: 'function' as const,
					function: { name: b.toolName!, arguments: JSON.stringify(b.toolArgs ?? {}) },
				}));
			const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
				role: 'assistant',
				content: text || null,
			};
			if (tools.length > 0) msg.tool_calls = tools;
			msgs.push(msg);
			continue;
		}
		if (entry.role === 'tool') {
			const text = entry.content
				.map((c) => (c.type === 'text' ? (c.text ?? '') : '[binary content]'))
				.join('\n');
			msgs.push({ role: 'tool', tool_call_id: entry.toolUseId, content: text });
		}
	}
	return msgs;
}

function usesMaxCompletionTokens(model: string): boolean {
	const normalized = model.trim().toLowerCase();
	return normalized.startsWith('gpt-5') || /^o\d/.test(normalized);
}

function applyMaxTokens(
	params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
	model: string,
	maxTokens: number
): void {
	if (usesMaxCompletionTokens(model)) {
		(
			params as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
				max_completion_tokens: number;
			}
		).max_completion_tokens = maxTokens;
		return;
	}

	params.max_tokens = maxTokens;
}

export interface OpenAIAdapterOptions {
	apiKey: string;
	baseURL?: string;
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => OpenAI;
}

export class OpenAIAdapter implements ProviderAdapter {
	private readonly client: OpenAI;

	constructor(opts: OpenAIAdapterOptions) {
		if (!opts.apiKey) throw new ProviderAuthError('OpenAI api key not configured');
		const factory =
			opts.clientFactory ?? ((c) => new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL }));
		this.client = factory({ apiKey: opts.apiKey, baseURL: opts.baseURL });
	}

	async *stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent> {
		const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = req.tools.map((t) => ({
			type: 'function',
			function: {
				name: t.name,
				description: t.description,
				parameters: t.schema as Record<string, unknown>,
			},
		}));

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model: req.model,
			messages: buildChatMessages(req.system, req.messages),
			tools: tools.length > 0 ? tools : undefined,
			stream: true,
		};
		applyMaxTokens(params, req.model, req.maxTokens);

		yield { type: 'message_start' };

		const usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const callsByIndex = new Map<number, { id: string; name: string; emittedStart: boolean }>();

		try {
			const stream = await this.client.chat.completions.create(params, { signal: req.signal });
			for await (const chunk of stream) {
				const choice = chunk.choices?.[0];
				if (!choice) continue;
				const delta = choice.delta;
				if (delta?.content) {
					yield { type: 'text_delta', text: delta.content };
				}
				if (delta?.tool_calls) {
					for (const tc of delta.tool_calls) {
						const idx = tc.index ?? 0;
						let state = callsByIndex.get(idx);
						if (!state) {
							state = {
								id: tc.id ?? '',
								name: tc.function?.name ?? '',
								emittedStart: false,
							};
							callsByIndex.set(idx, state);
						} else {
							if (tc.id) state.id = tc.id;
							if (tc.function?.name) state.name = tc.function.name;
						}
						if (!state.emittedStart && state.id && state.name) {
							state.emittedStart = true;
							yield { type: 'tool_call_start', id: state.id, name: state.name };
						}
						if (tc.function?.arguments && state.id) {
							yield {
								type: 'tool_call_args_delta',
								id: state.id,
								jsonDelta: tc.function.arguments,
							};
						}
					}
				}
				if (choice.finish_reason) {
					stopReason = choice.finish_reason;
					for (const s of callsByIndex.values()) {
						if (s.emittedStart) yield { type: 'tool_call_end', id: s.id };
					}
				}
				const u = (chunk as { usage?: { prompt_tokens?: number; completion_tokens?: number } })
					.usage;
				if (u) {
					usage.inputTokens = u.prompt_tokens ?? usage.inputTokens;
					usage.outputTokens = u.completion_tokens ?? usage.outputTokens;
				}
			}
		} catch (err) {
			const status = (err as { status?: number }).status ?? 0;
			const msg = (err as Error).message ?? String(err);
			if (status === 401 || status === 403) throw new ProviderAuthError(msg);
			if (/context|too long|exceed/i.test(msg)) throw new ContextOverflowError(msg);
			throw err;
		}

		yield { type: 'message_end', stopReason, usage };
	}
}
