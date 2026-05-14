import Anthropic from '@anthropic-ai/sdk';
import type {
	ProviderAdapter,
	ProviderEvent,
	ProviderStreamRequest,
	TranscriptEntry,
} from './types';
import { ContextOverflowError, ProviderAuthError } from './types';

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
				} else if (b.type === 'tool_use' && b.toolUseId && b.toolName) {
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
			const blocks: Anthropic.Messages.ToolResultBlockParam[] = [
				{
					type: 'tool_result',
					tool_use_id: entry.toolUseId,
					content: entry.content.map((c) =>
						c.type === 'text'
							? { type: 'text' as const, text: c.text ?? '' }
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
					is_error: entry.isError === true ? true : undefined,
				},
			];
			msgs.push({ role: 'user', content: blocks });
		}
	}
	return msgs;
}

export interface AnthropicAdapterOptions {
	apiKey: string;
	baseURL?: string;
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => Anthropic;
}

export class AnthropicAdapter implements ProviderAdapter {
	private readonly client: Anthropic;

	constructor(opts: AnthropicAdapterOptions) {
		if (!opts.apiKey) throw new ProviderAuthError('Anthropic api key not configured');
		const factory =
			opts.clientFactory ?? ((c) => new Anthropic({ apiKey: c.apiKey, baseURL: c.baseURL }));
		this.client = factory({ apiKey: opts.apiKey, baseURL: opts.baseURL });
	}

	async *stream(req: ProviderStreamRequest): AsyncIterable<ProviderEvent> {
		const tools: Anthropic.Messages.Tool[] = req.tools.map((t) => ({
			name: t.name,
			description: t.description,
			input_schema: t.schema as Anthropic.Messages.Tool.InputSchema,
		}));

		yield { type: 'message_start' };

		const usage = { inputTokens: 0, outputTokens: 0 };
		let stopReason = 'end_turn';
		const blockIndexToToolUseId = new Map<number, string>();

		try {
			const stream = this.client.messages.stream(
				{
					model: req.model,
					system: req.system,
					max_tokens: req.maxTokens,
					tools: tools.length > 0 ? tools : undefined,
					messages: buildAnthropicMessages(req.messages),
				},
				{ signal: req.signal }
			);

			for await (const event of stream) {
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
					if (event.usage) usage.outputTokens += event.usage.output_tokens ?? 0;
				} else if (event.type === 'message_start') {
					if (event.message.usage) {
						usage.inputTokens += event.message.usage.input_tokens ?? 0;
						usage.outputTokens += event.message.usage.output_tokens ?? 0;
					}
				}
			}
		} catch (err) {
			const status = (err as { status?: number }).status ?? 0;
			const msg = (err as Error).message ?? String(err);
			if (status === 401 || status === 403) throw new ProviderAuthError(msg);
			if (/context|too long|max.*tokens|exceed/i.test(msg)) throw new ContextOverflowError(msg);
			throw err;
		}

		yield { type: 'message_end', stopReason, usage };
	}
}
