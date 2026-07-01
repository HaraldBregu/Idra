import { AgentModel } from '../../llm';
import type {
	Provider,
	RuntimeEvent,
	RuntimeInput,
	Message,
	MessageContentBlock,
	ToolCall,
} from '../types';
import type { Config, Tool } from '../types';
import { parseToolArgs } from '../shared/args';
import { getModelId, getProvider } from '../settings/settings-store';
import {
	addAssistantMessage,
	addToolResults,
	appendRun,
	isExhausted,
	recordTurn,
	toResult,
	type SessionState,
} from '../session';
import { loadTools } from '../tools/loader';
import { loadMcpTools } from '../tools/mcp/loader';
import { buildSystemPrompt } from '../system';
import { formatToolOutput } from '../shared/format';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
	providerItems?: MessageContentBlock[];
}

export class Runner {
	private readonly model = new AgentModel();

	constructor(
		private readonly config: Config,
		private readonly session: SessionState,
	) {}

	async *run(input: RuntimeInput): AsyncGenerator<RuntimeEvent> {
		const signal = new AbortController().signal;
		const session = this.session;

		try {
			for await (const event of this.stream(input, signal, session)) {
				appendRun(session, event);
				yield event;
			}
		} catch (error) {
			appendRun(session, {
				type: 'run_error',
				message: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async *stream(
		input: RuntimeInput,
		signal: AbortSignal,
		session: SessionState,
	): AsyncGenerator<RuntimeEvent> {
		const provider = getProvider();
		const modelId = getModelId();

		if (!provider || !modelId)
			throw new Error('Agent requires a configured provider and model.');

		const tools: Tool[] = [];

		const toolLoader = new ToolsLoader();
		tools.push(...toolLoader.tools);

		const mcp = await loadMcpTools();
		tools.push(...mcp.tools);

		const systemPrompt = await buildSystemPrompt(this.config);

		yield {
			type: 'run_started',
			sessionId: session.id,
			model: modelId,
			providerId: provider.id,
		};

		try {
			while (true) {
				const turn = yield* this.runModelTurn(
					input,
					provider,
					modelId,
					systemPrompt,
					session.messages,
					tools,
					signal
				);

				recordTurn(session, turn);

				yield {
					type: 'assistant_message',
					content: turn.content,
					toolCalls: turn.toolCalls,
				};
				addAssistantMessage(session, turn.content, turn.toolCalls, turn.providerItems);

				if (turn.toolCalls.length === 0) {
					const result = toResult(session, 'success');
					yield { type: 'run_finished', result };
					return;
				}

				if (isExhausted(session)) {
					const result = toResult(session, 'error_max_turns');
					yield { type: 'run_finished', result };
					return;
				}

				yield* this.runToolCalls(tools, turn.toolCalls);
				addToolResults(session, turn.toolCalls);
			}
		} finally {
			await mcp.close();
		}
	}

	private async *runModelTurn(
		_input: RuntimeInput,
		provider: Provider,
		modelId: string,
		systemPrompt: string | undefined,
		messages: Message[],
		tools: Tool[],
		signal: AbortSignal
	): AsyncGenerator<RuntimeEvent, ModelTurn> {
		const maxRetries = 1;
		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			let content = '';
			let model = modelId;
			let stopReason: string | undefined;
			let usage: ModelTurn['usage'];
			const providerItems: MessageContentBlock[] = [];
			const pending = new Map<string, { name: string; argsText: string }>();

			const maxTokens = 4096;
			try {
				for await (const event of this.model.stream({
					provider,
					model,
					systemPrompt,
					messages,
					tools,
					maxTokens,
					signal,
				})) {
					if (event.type === 'model_call_delta') content += event.delta;
					if (event.type === 'model_provider_item') {
						providerItems.push({
							type: 'provider_item',
							provider: event.provider,
							item: event.item,
						});
					}
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
					providerItems,
					toolCalls: [...pending].map(([id, toolCall]) => ({
						id,
						name: toolCall.name,
						args: parseToolArgs(toolCall.argsText),
					})),
				};
			} catch (error) {
				if (attempt >= maxRetries) throw error;
			}
		}

		return { content: '', model: modelId, toolCalls: [] };
	}

	private async *runToolCalls(
		tools: Tool[],
		toolCalls: ToolCall[]
	): AsyncGenerator<RuntimeEvent, void> {
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		for (const toolCall of toolCalls) {
			yield* this.runToolCall(toolMap.get(toolCall.name), toolCall);
		}
	}

	private async *runToolCall(
		tool: Tool | undefined,
		toolCall: ToolCall
	): AsyncGenerator<RuntimeEvent, void> {
		const startedAtMs = Date.now();

		yield {
			type: 'tool_call_start',
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			input: toolCall.args,
		};

		let output: unknown;
		let isError: boolean | undefined;

		if (!tool) {
			output = `Error: unknown tool '${toolCall.name}'`;
			isError = true;
		} else {
			try {
				output = await tool.run(toolCall.args);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				output = `Error: tool '${toolCall.name}' failed: ${message}`;
				isError = true;
			}
		}

		yield {
			type: 'tool_call_end',
			toolCallId: toolCall.id,
			toolName: toolCall.name,
			input: toolCall.args,
			output,
			isError,
			durationMs: Date.now() - startedAtMs,
		};

		toolCall.result = {
			content: formatToolOutput(output),
			isError,
		};
	}
}
