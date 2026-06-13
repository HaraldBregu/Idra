import Anthropic from '@anthropic-ai/sdk';
import type { Messages as BetaMessages } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import OpenAI from 'openai';
import type {
	FunctionTool,
	ResponseCreateParamsStreaming,
	ResponseFunctionToolCall,
	ResponseInput,
	ResponseInputItem,
	ResponseOutputItem,
	ResponseStreamEvent,
	Tool as ResponseTool,
} from 'openai/resources/responses/responses';
import { adaptAnthropicMcpServers } from './mcp/anthropic';
import { adaptOpenAIMcpTools } from './mcp/openai';
import type {
	AgentContentBlock,
	ProviderAdapter,
	ProviderEvent,
	ProviderSpec,
	ProviderStreamRequest,
	TranscriptEntry,
	Usage,
} from './types';
import { ContextOverflowError, ProviderAuthError } from './types';

type ReasoningContentBlock = Extract<AgentContentBlock, { type: 'reasoning' }>;

interface LlmClientFactoryInput {
	apiKey: string;
	baseURL?: string;
}

export interface ModeSdkOptions {
	provider: ProviderSpec;
	openAIClientFactory?: (opts: LlmClientFactoryInput) => OpenAI;
	anthropicClientFactory?: (opts: LlmClientFactoryInput) => Anthropic;
	reasoningEffortEnabled?: boolean;
	reasoningContentEnabled?: boolean;
	thinkingModeEnabled?: boolean;
}

interface ResponseToolCallState {
	id: string;
	name: string;
	argsStr: string;
	emittedStart: boolean;
	emittedEnd: boolean;
}

interface ChatToolCallState {
	id: string;
	name: string;
	argsStr: string;
	emittedStart: boolean;
}

export class ModeSdk implements ProviderAdapter {
	private readonly provider: ProviderSpec;
	private readonly openAIClientFactory?: (opts: LlmClientFactoryInput) => OpenAI;
	private readonly anthropicClientFactory?: (opts: LlmClientFactoryInput) => Anthropic;
	private readonly reasoningEffortEnabled: boolean;
	private readonly reasoningContentEnabled: boolean;
	private readonly thinkingModeEnabled: boolean;

	constructor(options: ModeSdkOptions) {
		this.provider = options.provider;
		this.openAIClientFactory = options.openAIClientFactory;
		this.anthropicClientFactory = options.anthropicClientFactory;
		this.reasoningEffortEnabled = options.reasoningEffortEnabled ?? false;
		this.reasoningContentEnabled = options.reasoningContentEnabled ?? false;
		this.thinkingModeEnabled = options.thinkingModeEnabled ?? false;
	}

	async *stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent> {
		const provider = this.provider;

		const id = provider.id.toLowerCase();
		if (id === 'anthropic') {
			yield* this.streamAnthropic(provider, req);
			return;
		}
		if (id === 'openai') {
			yield* this.streamOpenAIResponses(provider, req);
			return;
		}
		yield* this.streamOpenAIChat(provider, req);
	}

	private async *streamOpenAIResponses(
		provider: ProviderSpec,
		req: ProviderStreamRequest
	): AsyncIterable<ProviderEvent> {
		const client = this.createOpenAIClient(provider, 'OpenAI api key not configured');
		const functionTools: FunctionTool[] = req.tools.map((tool) => ({
			type: 'function',
			name: tool.name,
			description: tool.description,
			parameters: tool.schema as Record<string, unknown>,
			strict: false,
		}));
		const tools: ResponseTool[] = [
			...functionTools,
			...adaptOpenAIMcpTools(req.mcp),
		];

		const params: ResponseCreateParamsStreaming = {
			model: req.model,
			instructions: req.system || undefined,
			input:
				(req.inputItems as ResponseCreateParamsStreaming['input']) ??
				buildResponseInput(req.messages),
			previous_response_id: req.previousResponseId,
			tools: tools.length > 0 ? tools : undefined,
			reasoning: req.effort ? { effort: req.effort } : undefined,
			max_output_tokens: req.maxTokens,
			include: ['reasoning.encrypted_content'],
			stream: true,
		};

		yield { type: 'message_start' };

		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const callsByOutputIndex = new Map<number, ResponseToolCallState>();

		const emitToolStart = function* (state: ResponseToolCallState): Iterable<ProviderEvent> {
			if (state.emittedStart) return;
			if (!state.id || !state.name) return;
			state.emittedStart = true;
			yield { type: 'tool_call_start', id: state.id, name: state.name };
		};

		const emitToolEnd = function* (state: ResponseToolCallState): Iterable<ProviderEvent> {
			if (state.emittedEnd || !state.emittedStart) return;
			state.emittedEnd = true;
			yield { type: 'tool_call_end', id: state.id };
		};

		const stateFor = (
			outputIndex: number,
			fallbackId: string,
			fallbackName = '',
			preferId = false
		): ResponseToolCallState => {
			let state = callsByOutputIndex.get(outputIndex);
			if (!state) {
				state = {
					id: fallbackId,
					name: fallbackName,
					argsStr: '',
					emittedStart: false,
					emittedEnd: false,
				};
				callsByOutputIndex.set(outputIndex, state);
			}
			if (fallbackId && (preferId || !state.id)) state.id = fallbackId;
			if (fallbackName) state.name = fallbackName;
			return state;
		};

		try {
			const stream = await client.responses.create(params, { signal: req.signal });
			for await (const event of stream) {
				for (const providerEvent of this.adaptOpenAIResponseEvent(
					event,
					usage,
					stateFor,
					emitToolStart,
					emitToolEnd,
					(stop) => {
						stopReason = stop;
					}
				)) {
					yield providerEvent;
				}
			}
		} catch (err) {
			this.throwProviderError(err);
		}

		for (const state of callsByOutputIndex.values()) {
			for (const providerEvent of emitToolEnd(state)) yield providerEvent;
		}

		yield { type: 'message_end', stopReason, usage };
	}

	private *adaptOpenAIResponseEvent(
		event: ResponseStreamEvent,
		usage: Usage,
		stateFor: (
			outputIndex: number,
			fallbackId: string,
			fallbackName?: string,
			preferId?: boolean
		) => ResponseToolCallState,
		emitToolStart: (state: ResponseToolCallState) => Iterable<ProviderEvent>,
		emitToolEnd: (state: ResponseToolCallState) => Iterable<ProviderEvent>,
		setStopReason: (stopReason: string) => void
	): Iterable<ProviderEvent> {
		switch (event.type) {
			case 'response.created':
				yield { type: 'response_created', id: event.response.id };
				break;
			case 'response.output_item.added': {
				if (event.item.type !== 'function_call') break;
				const item = event.item as ResponseFunctionToolCall;
				const state = stateFor(event.output_index, item.call_id, item.name, true);
				for (const providerEvent of emitToolStart(state)) yield providerEvent;
				break;
			}
			case 'response.function_call_arguments.delta': {
				const state = stateFor(event.output_index, event.item_id);
				for (const providerEvent of emitToolStart(state)) yield providerEvent;
				state.argsStr += event.delta;
				if (state.id) {
					yield {
						type: 'tool_call_args_delta',
						id: state.id,
						jsonDelta: event.delta,
					};
				}
				break;
			}
			case 'response.function_call_arguments.done': {
				const state = stateFor(event.output_index, event.item_id, event.name);
				for (const providerEvent of emitToolStart(state)) yield providerEvent;
				if (!state.argsStr && event.arguments) {
					state.argsStr = event.arguments;
					yield {
						type: 'tool_call_args_delta',
						id: state.id,
						jsonDelta: event.arguments,
					};
				}
				for (const providerEvent of emitToolEnd(state)) yield providerEvent;
				break;
			}
			case 'response.output_item.done': {
				if (event.item.type === 'reasoning') {
					yield { type: 'reasoning_item', item: event.item };
					break;
				}
				if (event.item.type === 'mcp_approval_request') {
					yield {
						type: 'mcp_approval_request',
						id: event.item.id,
						serverLabel: event.item.server_label,
						name: event.item.name,
						arguments: event.item.arguments,
					};
					setStopReason('end_turn');
					break;
				}
				if (event.item.type === 'mcp_list_tools') {
					yield {
						type: 'mcp_list_tools',
						serverLabel: event.item.server_label,
						item: event.item,
						tools: event.item.tools.map((tool) => ({
							name: tool.name,
							description: tool.description ?? undefined,
							inputSchema: isRecord(tool.input_schema) ? tool.input_schema : undefined,
						})),
					};
					break;
				}
				if (event.item.type === 'mcp_call') {
					yield {
						type: 'mcp_call',
						id: event.item.id,
						serverLabel: event.item.server_label,
						name: event.item.name,
						arguments: event.item.arguments,
						output: event.item.output ?? undefined,
						error: event.item.error ?? undefined,
						status: event.item.status,
						item: event.item,
					};
					break;
				}
				if (event.item.type !== 'function_call') break;
				const item = event.item as ResponseFunctionToolCall;
				const state = stateFor(event.output_index, item.call_id, item.name, true);
				for (const providerEvent of emitToolStart(state)) yield providerEvent;
				if (!state.argsStr && item.arguments) {
					state.argsStr = item.arguments;
					yield {
						type: 'tool_call_args_delta',
						id: state.id,
						jsonDelta: item.arguments,
					};
				}
				for (const providerEvent of emitToolEnd(state)) yield providerEvent;
				break;
			}
			case 'response.output_text.delta':
				yield { type: 'text_delta', text: event.delta };
				break;
			case 'response.mcp_call_arguments.delta':
			case 'response.mcp_call_arguments.done':
			case 'response.mcp_call.completed':
			case 'response.mcp_call.failed':
			case 'response.mcp_call.in_progress':
			case 'response.mcp_list_tools.completed':
			case 'response.mcp_list_tools.failed':
			case 'response.mcp_list_tools.in_progress':
				break;
			case 'response.completed':
				usage.inputTokens = event.response.usage?.input_tokens ?? usage.inputTokens;
				usage.outputTokens = event.response.usage?.output_tokens ?? usage.outputTokens;
				setStopReason(hasFunctionCall(event.response.output) ? 'tool_calls' : 'end_turn');
				break;
			case 'response.incomplete':
				usage.inputTokens = event.response.usage?.input_tokens ?? usage.inputTokens;
				usage.outputTokens = event.response.usage?.output_tokens ?? usage.outputTokens;
				setStopReason(
					event.response.incomplete_details?.reason === 'max_output_tokens'
						? 'max_tokens'
						: 'incomplete'
				);
				break;
			case 'response.failed':
				throw new Error(event.response.error?.message ?? 'OpenAI response failed.');
			case 'error':
				throw new Error(event.message);
		}
	}

	private async *streamAnthropic(
		provider: ProviderSpec,
		req: ProviderStreamRequest
	): AsyncIterable<ProviderEvent> {
		const client = this.createAnthropicClient(provider);
		const mcp = adaptAnthropicMcpServers(req.mcp);
		const tools: Array<Anthropic.Messages.Tool | BetaMessages.BetaToolUnion> = req.tools.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.schema as Anthropic.Messages.Tool.InputSchema,
		}));
		tools.push(...mcp.tools);

		yield { type: 'message_start' };

		const usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const blockIndexToToolUseId = new Map<number, string>();

		try {
			const stream: AsyncIterable<unknown> = mcp.servers.length > 0
				? client.beta.messages.stream({
					model: req.model,
					system: req.system,
					max_tokens: req.maxTokens,
					tools: tools.length > 0 ? tools as BetaMessages.BetaToolUnion[] : undefined,
					mcp_servers: mcp.servers,
					betas: ['mcp-client-2025-11-20'],
					messages: buildAnthropicMessages(req.messages),
				} as BetaMessages.MessageCreateParamsStreaming, { signal: req.signal })
				: client.messages.stream({
					model: req.model,
					system: req.system,
					max_tokens: req.maxTokens,
					tools: tools.length > 0 ? tools as Anthropic.Messages.Tool[] : undefined,
					messages: buildAnthropicMessages(req.messages),
				}, { signal: req.signal });

			for await (const rawEvent of stream) {
				if (!rawEvent || typeof rawEvent !== 'object') continue;
				const event = rawEvent as Anthropic.Messages.RawMessageStreamEvent;
				if (event.type === 'content_block_start') {
					if (event.content_block.type === 'tool_use') {
						blockIndexToToolUseId.set(event.index, event.content_block.id);
						yield {
							type: 'tool_call_start',
							id: event.content_block.id,
							name: event.content_block.name,
						};
					}
				} else if (event.type === 'content_block_delta') {
					const delta = event.delta;
					if (delta.type === 'text_delta') {
						yield { type: 'text_delta', text: delta.text };
					} else if (delta.type === 'input_json_delta') {
						const id = blockIndexToToolUseId.get(event.index) ?? '';
						yield { type: 'tool_call_args_delta', id, jsonDelta: delta.partial_json };
					}
				} else if (event.type === 'content_block_stop') {
					const id = blockIndexToToolUseId.get(event.index);
					if (id) yield { type: 'tool_call_end', id };
				} else if (event.type === 'message_delta') {
					if (event.delta.stop_reason) stopReason = event.delta.stop_reason;
					if (event.usage) usage.outputTokens = event.usage.output_tokens ?? usage.outputTokens;
				} else if (event.type === 'message_start') {
					if (event.message.usage) {
						usage.inputTokens = event.message.usage.input_tokens ?? usage.inputTokens;
						usage.outputTokens = event.message.usage.output_tokens ?? usage.outputTokens;
					}
				}
			}
		} catch (err) {
			this.throwProviderError(err);
		}

		yield { type: 'message_end', stopReason, usage };
	}

	private async *streamOpenAIChat(
		provider: ProviderSpec,
		req: ProviderStreamRequest
	): AsyncIterable<ProviderEvent> {
		const client = this.createOpenAIClient(provider, 'API key not configured');
		const tools: OpenAI.ChatCompletionTool[] = req.tools.map((t) => ({
			type: 'function' as const,
			function: {
				name: t.name,
				description: t.description,
				parameters: t.schema as Record<string, unknown>,
			},
		}));

		yield { type: 'message_start' };

		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const pending = new Map<number, ChatToolCallState>();

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
			const stream = await client.chat.completions.create(
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
			this.throwProviderError(err);
		}

		for (const state of pending.values()) {
			if (state.emittedStart) yield { type: 'tool_call_end', id: state.id };
		}

		yield { type: 'message_end', stopReason, usage };
	}

	private createOpenAIClient(provider: ProviderSpec, missingKeyMessage: string): OpenAI {
		if (!provider.apiKey) throw new ProviderAuthError(missingKeyMessage);
		const factory =
			this.openAIClientFactory ?? ((c) => new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL }));
		return factory({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}

	private createAnthropicClient(provider: ProviderSpec): Anthropic {
		if (!provider.apiKey) throw new ProviderAuthError('Anthropic api key not configured');
		const factory =
			this.anthropicClientFactory ??
			((c) => new Anthropic({ apiKey: c.apiKey, baseURL: c.baseURL }));
		return factory({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}

	private throwProviderError(err: unknown): never {
		const status = (err as { status?: number }).status ?? 0;
		const msg = (err as Error).message ?? String(err);
		if (status === 401 || status === 403) throw new ProviderAuthError(msg);
		if (/context|too long|max.*tokens|exceed/i.test(msg)) {
			throw new ContextOverflowError(msg);
		}
		throw err;
	}
}

function toolResultText(entry: Extract<TranscriptEntry, { role: 'tool' }>): string {
	return entry.content.map((c) => (c.type === 'text' ? c.text : '[binary content]')).join('\n');
}

function isOpenAIReasoningBlock(
	block: AgentContentBlock
): block is ReasoningContentBlock & { provider: 'openai' } {
	return block.type === 'reasoning' && block.provider === 'openai';
}

function isDeepSeekReasoningBlock(block: AgentContentBlock): block is ReasoningContentBlock {
	return block.type === 'reasoning' && block.provider === 'deepseek';
}

function asResponseInputItem(value: unknown): ResponseInputItem | null {
	if (typeof value !== 'object' || value === null) return null;
	const type = (value as { type?: unknown }).type;
	return type === 'reasoning' ||
		type === 'mcp_list_tools' ||
		type === 'mcp_call' ||
		type === 'mcp_approval_request' ||
		type === 'mcp_approval_response'
		? (value as ResponseInputItem)
		: null;
}

function buildResponseInput(transcript: TranscriptEntry[]): ResponseInput {
	const input: ResponseInput = [];

	for (const entry of transcript) {
		if (entry.role === 'user') {
			input.push({ role: 'user', content: entry.content });
			continue;
		}

		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((block) => block.type === 'text')
				.map((block) => block.text)
				.join('');
			const hasToolUse = entry.content.some((block) => block.type === 'tool_use');

			for (const block of entry.content) {
				const item =
					isOpenAIReasoningBlock(block) || block.type === 'provider_item'
						? asResponseInputItem(block.item)
						: null;
				if (item) input.push(item);
			}

			if (text) {
				input.push({
					type: 'message',
					role: 'assistant',
					content: text,
					phase: hasToolUse ? 'commentary' : 'final_answer',
				});
			}

			for (const block of entry.content) {
				if (block.type !== 'tool_use') continue;
				input.push({
					type: 'function_call',
					call_id: block.toolUseId,
					name: block.toolName,
					arguments: JSON.stringify(block.toolArgs ?? {}),
				});
			}
			continue;
		}

		input.push({
			type: 'function_call_output',
			call_id: entry.toolUseId,
			output: toolResultText(entry),
		});
	}

	return input;
}

function hasFunctionCall(output: ResponseOutputItem[] | undefined): boolean {
	return output?.some((item) => item.type === 'function_call') ?? false;
}

function buildAnthropicMessages(transcript: TranscriptEntry[]): Anthropic.Messages.MessageParam[] {
	const msgs: Anthropic.Messages.MessageParam[] = [];
	for (const entry of transcript) {
		if (entry.role === 'user') {
			msgs.push({ role: 'user', content: entry.content });
			continue;
		}
		if (entry.role === 'assistant') {
			const blocks: Array<
				Anthropic.Messages.TextBlockParam | Anthropic.Messages.ToolUseBlockParam
			> = [];
			for (const b of entry.content) {
				if (b.type === 'text' && b.text) {
					blocks.push({ type: 'text', text: b.text });
				} else if (b.type === 'tool_use') {
					blocks.push({
						type: 'tool_use',
						id: b.toolUseId,
						name: b.toolName,
						input: (b.toolArgs ?? {}) as Record<string, unknown>,
					});
				}
			}
			if (blocks.length === 0) blocks.push({ type: 'text', text: '' });
			msgs.push({ role: 'assistant', content: blocks });
			continue;
		}
		if (entry.role === 'tool') {
			const isError = entry.status ? entry.status !== 'ok' : entry.isError === true;
			const blocks: Anthropic.Messages.ToolResultBlockParam[] = [
				{
					type: 'tool_result',
					tool_use_id: entry.toolUseId,
					content: entry.content.map((c) =>
						c.type === 'text'
							? { type: 'text' as const, text: c.text }
							: {
									type: 'image' as const,
									source: {
										type: 'base64' as const,
										media_type: (c.mimeType ?? 'image/png') as
											| 'image/png'
											| 'image/jpeg'
											| 'image/gif'
											| 'image/webp',
										data: c.base64 ?? '',
									},
								}
					),
					is_error: isError ? true : undefined,
				},
			];
			msgs.push({ role: 'user', content: blocks });
		}
	}
	return msgs;
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

function toDeepSeekReasoningEffort(
	effort: ProviderStreamRequest['effort']
): 'high' | 'max' | undefined {
	if (!effort || effort === 'none') return undefined;
	if (effort === 'xhigh') return 'max';
	return 'high';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
