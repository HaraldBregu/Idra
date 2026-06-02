import type {
	AgentContentBlock,
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
	TranscriptEntry,
	Usage,
} from './types';
import { ContextOverflowError, ProviderAuthError } from './types';

type MistralReasoningEffort = 'none' | 'high';

type MistralContentChunk = {
	type?: string;
	text?: string;
};

type MistralToolCall = {
	id?: string;
	type?: string;
	function: {
		name: string;
		arguments: Record<string, unknown> | string;
	};
	index?: number;
};

type MistralMessage =
	| { role: 'system'; content: string }
	| { role: 'user'; content: string | null }
	| { role: 'assistant'; content?: string | null; toolCalls?: MistralToolCall[] | null }
	| { role: 'tool'; content: string | null; toolCallId?: string | null; name?: string | null };

type MistralTool = {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters: Record<string, unknown>;
	};
};

type MistralStreamRequest = {
	model: string;
	maxTokens?: number | null;
	stream?: boolean;
	messages: MistralMessage[];
	tools?: MistralTool[] | null;
	toolChoice?: 'auto' | 'none' | 'any' | 'required';
	parallelToolCalls?: boolean;
	reasoningEffort?: MistralReasoningEffort;
};

type MistralStreamOptions = {
	signal?: AbortSignal;
};

type MistralCompletionEvent = {
	data?: {
		usage?: {
			promptTokens?: number;
			completionTokens?: number;
		};
		choices?: Array<{
			index: number;
			delta: {
				content?: string | MistralContentChunk[] | null;
				toolCalls?: MistralToolCall[] | null;
			};
			finishReason?: string | null;
		}>;
	};
};

type MistralClient = {
	chat: {
		stream: (
			request: MistralStreamRequest,
			options?: MistralStreamOptions
		) => Promise<AsyncIterable<MistralCompletionEvent>>;
	};
};

export interface MistralAdapterOptions {
	apiKey: string;
	baseURL?: string;
	clientFactory?: (opts: { apiKey: string; serverURL?: string }) => MistralClient;
}

type MistralToolCallState = {
	id: string;
	name: string;
	argsStr: string;
	emittedStart: boolean;
	emittedArgsLength: number;
};

function normalizeMistralServerURL(baseURL?: string): string | undefined {
	const trimmed = baseURL?.trim().replace(/\/+$/, '');
	if (!trimmed) return undefined;
	return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
}

function toolResultText(entry: Extract<TranscriptEntry, { role: 'tool' }>): string {
	return entry.content
		.map((content) => (content.type === 'text' ? content.text : '[binary content]'))
		.join('\n');
}

function stringifyToolArgs(args: unknown): string {
	return typeof args === 'string' ? args : JSON.stringify(args ?? {});
}

function toolNamesById(transcript: TranscriptEntry[]): Map<string, string> {
	const names = new Map<string, string>();
	for (const entry of transcript) {
		if (entry.role !== 'assistant') continue;
		for (const block of entry.content) {
			if (block.type === 'tool_use') names.set(block.toolUseId, block.toolName);
		}
	}
	return names;
}

function buildMistralMessages(system: string, transcript: TranscriptEntry[]): MistralMessage[] {
	const messages: MistralMessage[] = [];
	if (system) messages.push({ role: 'system', content: system });

	const toolNames = toolNamesById(transcript);
	for (const entry of transcript) {
		if (entry.role === 'user') {
			messages.push({ role: 'user', content: entry.content });
			continue;
		}

		if (entry.role === 'assistant') {
			const text = entry.content
				.filter((block): block is Extract<AgentContentBlock, { type: 'text' }> => block.type === 'text')
				.map((block) => block.text)
				.join('');
			const toolCalls = entry.content
				.filter(
					(block): block is Extract<AgentContentBlock, { type: 'tool_use' }> =>
						block.type === 'tool_use'
				)
				.map((block, index) => ({
					id: block.toolUseId,
					type: 'function',
					index,
					function: {
						name: block.toolName,
						arguments: stringifyToolArgs(block.toolArgs),
					},
				}));
			messages.push({
				role: 'assistant',
				content: text || null,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			});
			continue;
		}

		messages.push({
			role: 'tool',
			toolCallId: entry.toolUseId,
			name: toolNames.get(entry.toolUseId),
			content: toolResultText(entry),
		});
	}

	return messages;
}

function contentText(content: string | MistralContentChunk[] | null | undefined): string {
	if (typeof content === 'string') return content;
	if (!Array.isArray(content)) return '';
	return content.map((chunk) => (chunk.type === 'text' ? chunk.text ?? '' : '')).join('');
}

function toMistralReasoningEffort(
	effort: ProviderStreamRequest['effort']
): MistralReasoningEffort | undefined {
	if (effort === 'none') return 'none';
	if (effort === 'high' || effort === 'xhigh') return 'high';
	return undefined;
}

function mapFinishReason(reason: string | null | undefined): string {
	if (reason === 'tool_calls') return 'tool_calls';
	if (reason === 'length') return 'max_tokens';
	if (reason === 'error') return 'error';
	return 'end_turn';
}

function errorStatus(err: unknown): number {
	if (typeof err !== 'object' || err === null) return 0;
	const statusCode = (err as { statusCode?: unknown }).statusCode;
	if (typeof statusCode === 'number') return statusCode;
	const status = (err as { status?: unknown }).status;
	return typeof status === 'number' ? status : 0;
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function normalizeAbortError(err: unknown): never {
	const message = errorMessage(err);
	const abortError = new Error(message);
	abortError.name = 'AbortError';
	throw abortError;
}

function createMistralClient(opts: { apiKey: string; serverURL?: string }): MistralClient {
	let clientPromise: Promise<MistralClient> | undefined;
	const loadClient = async (): Promise<MistralClient> => {
		clientPromise ??= import('@mistralai/mistralai').then(
			({ Mistral }) =>
				new Mistral({
					apiKey: opts.apiKey,
					serverURL: opts.serverURL,
				}) as MistralClient
		);
		return clientPromise;
	};

	return {
		chat: {
			stream: async (request, options) => {
				const client = await loadClient();
				return client.chat.stream(request, options);
			},
		},
	};
}

export class MistralAdapter implements ProviderAdapter {
	private readonly client: MistralClient;

	constructor(opts: MistralAdapterOptions) {
		if (!opts.apiKey) throw new ProviderAuthError('Mistral api key not configured');
		const factory = opts.clientFactory ?? createMistralClient;
		this.client = factory({
			apiKey: opts.apiKey,
			serverURL: normalizeMistralServerURL(opts.baseURL),
		});
	}

	async *stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent> {
		const tools: MistralTool[] = req.tools.map((tool) => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.schema as Record<string, unknown>,
			},
		}));

		yield { type: 'message_start' };

		const usage: Usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const pending = new Map<number, MistralToolCallState>();

		const emitToolStart = function* (state: MistralToolCallState): Iterable<ProviderEvent> {
			if (state.emittedStart || !state.id || !state.name) return;
			state.emittedStart = true;
			yield { type: 'tool_call_start', id: state.id, name: state.name };
		};

		const emitToolArgs = function* (state: MistralToolCallState): Iterable<ProviderEvent> {
			if (!state.emittedStart) return;
			const jsonDelta = state.argsStr.slice(state.emittedArgsLength);
			if (!jsonDelta) return;
			state.emittedArgsLength = state.argsStr.length;
			yield { type: 'tool_call_args_delta', id: state.id, jsonDelta };
		};

		try {
			const stream = await this.client.chat.stream(
				{
					model: req.model,
					messages: buildMistralMessages(req.system, req.messages),
					tools: tools.length > 0 ? tools : undefined,
					toolChoice: tools.length > 0 ? 'auto' : undefined,
					parallelToolCalls: tools.length > 0 ? true : undefined,
					maxTokens: req.maxTokens,
					reasoningEffort: toMistralReasoningEffort(req.effort),
				},
				{ signal: req.signal }
			);

			for await (const event of stream) {
				if (event.data?.usage) {
					usage.inputTokens = event.data.usage.promptTokens ?? usage.inputTokens;
					usage.outputTokens = event.data.usage.completionTokens ?? usage.outputTokens;
				}

				const choice = event.data?.choices?.[0];
				if (!choice) continue;

				const text = contentText(choice.delta.content);
				if (text) yield { type: 'text_delta', text };

				for (const toolCall of choice.delta.toolCalls ?? []) {
					const index = toolCall.index ?? pending.size;
					let state = pending.get(index);
					if (!state) {
						state = {
							id: toolCall.id ?? `mistral_tool_${index}`,
							name: toolCall.function.name,
							argsStr: '',
							emittedStart: false,
							emittedArgsLength: 0,
						};
						pending.set(index, state);
					}
					if (toolCall.id) state.id = toolCall.id;
					if (toolCall.function.name) state.name = toolCall.function.name;

					const nextArgs = stringifyToolArgs(toolCall.function.arguments);
					const jsonDelta = state.argsStr && nextArgs.startsWith(state.argsStr)
						? nextArgs.slice(state.argsStr.length)
						: nextArgs;
					state.argsStr += jsonDelta;

					for (const providerEvent of emitToolStart(state)) yield providerEvent;
					for (const providerEvent of emitToolArgs(state)) yield providerEvent;
				}

				if (choice.finishReason) stopReason = mapFinishReason(choice.finishReason);
			}
		} catch (err) {
			if ((err as Error).name === 'RequestAbortedError') normalizeAbortError(err);
			const status = errorStatus(err);
			const msg = errorMessage(err);
			if (status === 401 || status === 403) throw new ProviderAuthError(msg);
			if (/context|too long|max.*tokens|exceed/i.test(msg)) throw new ContextOverflowError(msg);
			throw err;
		}

		for (const state of pending.values()) {
			for (const providerEvent of emitToolStart(state)) yield providerEvent;
			for (const providerEvent of emitToolArgs(state)) yield providerEvent;
			if (state.emittedStart) yield { type: 'tool_call_end', id: state.id };
		}

		yield { type: 'message_end', stopReason, usage };
	}
}
