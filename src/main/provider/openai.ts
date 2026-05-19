import OpenAI from 'openai';
import type {
	FunctionTool,
	ResponseCreateParamsStreaming,
	ResponseFunctionToolCall,
	ResponseInput,
	ResponseInputItem,
	ResponseOutputItem,
	ResponseStreamEvent,
} from 'openai/resources/responses/responses';
import type {
	AgentContentBlock,
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
	TranscriptEntry,
	Usage,
} from './types';
import { ContextOverflowError, ProviderAuthError } from './types';

function toolResultText(entry: Extract<TranscriptEntry, { role: 'tool' }>): string {
	return entry.content
		.map((c) => (c.type === 'text' ? c.text : '[binary content]'))
		.join('\n');
}

function isOpenAIReasoningBlock(
	block: AgentContentBlock
): block is Extract<AgentContentBlock, { type: 'reasoning'; provider: 'openai' }> {
	return block.type === 'reasoning' && block.provider === 'openai';
}

function asResponseInputItem(value: unknown): ResponseInputItem | null {
	if (typeof value !== 'object' || value === null) return null;
	const type = (value as { type?: unknown }).type;
	return type === 'reasoning' ? value as ResponseInputItem : null;
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
				if (!isOpenAIReasoningBlock(block)) continue;
				const item = asResponseInputItem(block.item);
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

function usageFromResponse(response: { usage?: {
	input_tokens?: number;
	output_tokens?: number;
} | null }): Usage {
	return {
		inputTokens: response.usage?.input_tokens ?? 0,
		outputTokens: response.usage?.output_tokens ?? 0,
	};
}

function hasFunctionCall(output: ResponseOutputItem[] | undefined): boolean {
	return output?.some((item) => item.type === 'function_call') ?? false;
}

export interface OpenAIAdapterOptions {
	apiKey: string;
	baseURL?: string;
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => OpenAI;
}

interface ResponseToolCallState {
	id: string;
	name: string;
	argsStr: string;
	emittedStart: boolean;
	emittedEnd: boolean;
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
		const tools: FunctionTool[] = req.tools.map((tool) => ({
			type: 'function',
			name: tool.name,
			description: tool.description,
			parameters: tool.schema as Record<string, unknown>,
			strict: false,
		}));

		const params: ResponseCreateParamsStreaming = {
			model: req.model,
			instructions: req.system || undefined,
			input: buildResponseInput(req.messages),
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

		const emitToolStart = function* (
			state: ResponseToolCallState
		): Iterable<ProviderEvent> {
			if (state.emittedStart) return;
			if (!state.id || !state.name) return;
			state.emittedStart = true;
			yield { type: 'tool_call_start', id: state.id, name: state.name };
		};

		const emitToolEnd = function* (
			state: ResponseToolCallState
		): Iterable<ProviderEvent> {
			if (state.emittedEnd || !state.emittedStart) return;
			state.emittedEnd = true;
			yield { type: 'tool_call_end', id: state.id };
		};

		const stateFor = (
			outputIndex: number,
			fallbackId: string,
			fallbackName = ''
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
			if (fallbackId) state.id = fallbackId;
			if (fallbackName) state.name = fallbackName;
			return state;
		};

		try {
			const stream = await this.client.responses.create(params, { signal: req.signal });
			for await (const event of stream) {
				for (const providerEvent of this.adaptResponseEvent(
					event,
					usage,
					callsByOutputIndex,
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
			const status = (err as { status?: number }).status ?? 0;
			const msg = (err as Error).message ?? String(err);
			if (status === 401 || status === 403) throw new ProviderAuthError(msg);
			if (/context|too long|max.*tokens|exceed/i.test(msg)) {
				throw new ContextOverflowError(msg);
			}
			throw err;
		}

		for (const state of callsByOutputIndex.values()) {
			for (const providerEvent of emitToolEnd(state)) yield providerEvent;
		}

		yield { type: 'message_end', stopReason, usage };
	}

	private *adaptResponseEvent(
		event: ResponseStreamEvent,
		usage: Usage,
		callsByOutputIndex: Map<number, ResponseToolCallState>,
		stateFor: (
			outputIndex: number,
			fallbackId: string,
			fallbackName?: string
		) => ResponseToolCallState,
		emitToolStart: (state: ResponseToolCallState) => Iterable<ProviderEvent>,
		emitToolEnd: (state: ResponseToolCallState) => Iterable<ProviderEvent>,
		setStopReason: (stopReason: string) => void
	): Iterable<ProviderEvent> {
		switch (event.type) {
			case 'response.output_item.added': {
				if (event.item.type !== 'function_call') break;
				const item = event.item as ResponseFunctionToolCall;
				const state = stateFor(event.output_index, item.call_id, item.name);
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
				if (event.item.type !== 'function_call') break;
				const item = event.item as ResponseFunctionToolCall;
				const state = stateFor(event.output_index, item.call_id, item.name);
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
}
