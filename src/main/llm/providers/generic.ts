import OpenAI from 'openai';
import type {
	AgentContentBlock,
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
	TranscriptEntry,
	Usage,
} from '../types';
import { ContextOverflowError, ProviderAuthError } from '../types';

type ReasoningContentBlock = Extract<AgentContentBlock, { type: 'reasoning' }>;

function isDeepSeekReasoningBlock(block: AgentContentBlock): block is ReasoningContentBlock {
	return block.type === 'reasoning' && block.provider === 'deepseek';
}

function buildChatMessages(
	system: string,
	transcript: TranscriptEntry[],
	options: { includeReasoningContent?: boolean } = {}
): OpenAI.ChatCompletionMessageParam[] {
	const msgs: OpenAI.ChatCompletionMessageParam[] = [];
	if (system) msgs.push({ role: 'system', content: system });

	for (const entry of transcript) {
		if (entry.role === 'user') {
			msgs.push({ role: 'user', content: entry.content });
			continue;
		}
		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((b): b is Extract<AgentContentBlock, { type: 'text' }> => b.type === 'text')
				.map((b) => b.text)
				.join('');
			const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = entry.content
				.filter((b): b is Extract<AgentContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
				.map((b) => ({
					id: b.toolUseId,
					type: 'function' as const,
					function: { name: b.toolName, arguments: JSON.stringify(b.toolArgs ?? {}) },
				}));
			const msg: OpenAI.ChatCompletionAssistantMessageParam = {
				role: 'assistant',
				content: text || null,
			};
			if (options.includeReasoningContent) {
				const reasoningContent = entry.content
					.filter(isDeepSeekReasoningBlock)
					.map((b) => (typeof b.item === 'string' ? b.item : ''))
					.join('');
				if (reasoningContent) {
					(
						msg as OpenAI.ChatCompletionAssistantMessageParam & { reasoning_content?: string }
					).reasoning_content = reasoningContent;
				}
			}
			if (toolCalls.length > 0) msg.tool_calls = toolCalls;
			msgs.push(msg);
			continue;
		}
		if (entry.role === 'tool') {
			const text = entry.content
				.map((c) => (c.type === 'text' ? c.text : '[binary content]'))
				.join('\n');
			msgs.push({ role: 'tool', tool_call_id: entry.toolUseId, content: text });
		}
	}

	return msgs;
}

export interface OpenAIChatAdapterOptions {
	apiKey: string;
	baseURL?: string;
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => OpenAI;
	reasoningEffortEnabled?: boolean;
	reasoningContentEnabled?: boolean;
	thinkingModeEnabled?: boolean;
}

interface ChatToolCallState {
	id: string;
	name: string;
	argsStr: string;
	emittedStart: boolean;
}

export class OpenAIChatAdapter implements ProviderAdapter {
	private readonly client: OpenAI;
	private readonly reasoningEffortEnabled: boolean;
	private readonly reasoningContentEnabled: boolean;
	private readonly thinkingModeEnabled: boolean;

	constructor(opts: OpenAIChatAdapterOptions) {
		if (!opts.apiKey) throw new ProviderAuthError('API key not configured');
		const factory =
			opts.clientFactory ?? ((c) => new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL }));
		this.client = factory({ apiKey: opts.apiKey, baseURL: opts.baseURL });
		this.reasoningEffortEnabled = opts.reasoningEffortEnabled ?? false;
		this.reasoningContentEnabled = opts.reasoningContentEnabled ?? false;
		this.thinkingModeEnabled = opts.thinkingModeEnabled ?? false;
	}

	async *stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent> {
		const tools: OpenAI.ChatCompletionTool[] = req.tools.map((t) => ({
			type: 'function' as const,
			function: {
				name: t.name,
				description: t.description,
				parameters: t.schema as Record<string, unknown>,
			},
		}));

		console.log("Hello world");

		yield { type: 'message_start' };

		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const pending = new Map<number, ChatToolCallState>();

		const data = buildChatMessages(req.system, req.messages, {
			includeReasoningContent: this.reasoningContentEnabled,
		});
		console.log({ datachat: data });

		try {
			const params: Record<string, unknown> = {
				model: req.model,
				messages: buildChatMessages(req.system, req.messages, {
					includeReasoningContent: this.reasoningContentEnabled,
				}),
				tools: tools.length > 0 ? tools : undefined,
				tool_choice: tools.length > 0 ? 'auto' : undefined,
				max_tokens: req.maxTokens,
				stream: true,
				stream_options: { include_usage: true },
			};
			if (this.thinkingModeEnabled) {
				params.thinking = { type: req.effort === 'none' ? 'disabled' : 'enabled' };
			}
			if (this.reasoningEffortEnabled) {
				const reasoningEffort = toDeepSeekReasoningEffort(req.effort);
				if (reasoningEffort) params.reasoning_effort = reasoningEffort;
			}
			const stream = await this.client.chat.completions.create(
				params as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming,
				{ signal: req.signal }
			);

			for await (const chunk of stream) {
				if (chunk.usage) {
					usage.inputTokens = chunk.usage.prompt_tokens ?? usage.inputTokens;
					usage.outputTokens = chunk.usage.completion_tokens ?? usage.outputTokens;
				}

				const choice = chunk.choices?.[0];
				if (!choice) continue;

				const delta = choice.delta;

				const reasoningContent = (delta as { reasoning_content?: unknown }).reasoning_content;
				if (
					this.reasoningContentEnabled &&
					typeof reasoningContent === 'string' &&
					reasoningContent.length > 0
				) {
					yield { type: 'reasoning_item', provider: 'deepseek', item: reasoningContent };
				}

				if (delta.content) {
					yield { type: 'text_delta', text: delta.content };
				}

				if (delta.tool_calls) {
					for (const tc of delta.tool_calls) {
						let state = pending.get(tc.index);
						if (!state) {
							state = {
								id: tc.id ?? '',
								name: tc.function?.name ?? '',
								argsStr: '',
								emittedStart: false,
							};
							pending.set(tc.index, state);
						}
						if (tc.id) state.id = tc.id;
						if (tc.function?.name) state.name = tc.function.name;
						if (!state.emittedStart && state.id && state.name) {
							state.emittedStart = true;
							yield { type: 'tool_call_start', id: state.id, name: state.name };
						}
						if (tc.function?.arguments) {
							state.argsStr += tc.function.arguments;
							yield {
								type: 'tool_call_args_delta',
								id: state.id,
								jsonDelta: tc.function.arguments,
							};
						}
					}
				}

				if (choice.finish_reason) {
					stopReason =
						choice.finish_reason === 'tool_calls'
							? 'tool_calls'
							: choice.finish_reason === 'length'
								? 'max_tokens'
								: 'end_turn';
				}
			}
		} catch (err) {
			const status = (err as { status?: number }).status ?? 0;
			const msg = (err as Error).message ?? String(err);
			if (status === 401 || status === 403) throw new ProviderAuthError(msg);
			if (/context|too long|max.*tokens|exceed/i.test(msg)) throw new ContextOverflowError(msg);
			throw err;
		}

		for (const state of pending.values()) {
			if (state.emittedStart) yield { type: 'tool_call_end', id: state.id };
		}

		yield { type: 'message_end', stopReason, usage };
	}
}

function toDeepSeekReasoningEffort(
	effort: ProviderStreamRequest['effort']
): 'high' | 'max' | undefined {
	if (!effort || effort === 'none') return undefined;
	if (effort === 'xhigh') return 'max';
	return 'high';
}
