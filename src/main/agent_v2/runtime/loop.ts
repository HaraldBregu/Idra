import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeMessage,
	RuntimeModel,
	RuntimeRun,
	RuntimeTool,
	RuntimeToolCall,
} from './types';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: Required<RuntimeToolCall>[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

interface ToolOutcome {
	output: unknown;
	isError?: boolean;
}

export class AgentRuntime {
	constructor(private readonly model: RuntimeModel) {}

	run(input: RuntimeInput): RuntimeRun {
		const controller = new AbortController();
		let stopped = false;
		let stopReason = 'stopped';

		input.signal?.addEventListener(
			'abort',
			() => {
				stopped = true;
				controller.abort();
			},
			{ once: true }
		);

		return {
			stream: this.stream(input, controller.signal, () => stopped, () => stopReason),
			stop(reason = 'stopped'): void {
				stopped = true;
				stopReason = reason;
				controller.abort();
			},
		};
	}

	private async *stream(
		input: RuntimeInput,
		signal: AbortSignal,
		isStopped: () => boolean,
		getStopReason: () => string
	): AsyncGenerator<RuntimeEvent> {
		const messages = composeMessages(input);
		const toolCalls: RuntimeToolCall[] = [];
		const sessionId = input.sessionId ?? createSessionId();
		const usage = { inputTokens: 0, outputTokens: 0 };
		const maxTurns = input.maxTurns ?? input.maxIterations ?? 20;
		let numTurns = 0;
		let finalText = '';
		let lastModel = input.model ?? 'default';
		let lastStopReason: string | undefined;

		yield { type: 'run_started', sessionId, model: lastModel };

		while (true) {
			if (isStopped()) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			const turn = yield* this.runModelTurn(input, messages, signal, isStopped);
			if (turn === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			lastModel = turn.model;
			lastStopReason = turn.stopReason;
			usage.inputTokens += turn.usage?.inputTokens ?? 0;
			usage.outputTokens += turn.usage?.outputTokens ?? 0;
			if (turn.content) finalText = turn.content;

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			messages.push({
				role: 'assistant',
				content: turn.content,
				toolCalls: turn.toolCalls,
			});

			if (turn.toolCalls.length === 0) {
				yield {
					type: 'run_finished',
					result: {
						text: finalText,
						model: lastModel,
						toolCalls,
						numTurns,
						subtype: 'success',
						sessionId,
						stopReason: lastStopReason ?? 'end_turn',
						usage,
					},
				};
				return;
			}

			if (numTurns >= maxTurns) {
				yield {
					type: 'run_finished',
					result: {
						text: '',
						model: lastModel,
						toolCalls,
						numTurns,
						subtype: 'error_max_turns',
						sessionId,
						stopReason: lastStopReason,
						usage,
					},
				};
				return;
			}

			const results = yield* this.runToolCalls(input.tools ?? [], turn.toolCalls, isStopped);
			if (results === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}
			toolCalls.push(...turn.toolCalls);
			messages.push(...results);
			numTurns += 1;
			yield { type: 'user_message', messages: results };
		}
	}

	private async *runModelTurn(
		input: RuntimeInput,
		messages: RuntimeMessage[],
		signal: AbortSignal,
		isStopped: () => boolean
	): AsyncGenerator<RuntimeEvent, ModelTurn | null> {
		for (let attempt = 0; attempt <= (input.maxRetries ?? 1); attempt += 1) {
			let content = '';
			let model = input.model ?? 'default';
			let stopReason: string | undefined;
			let usage: ModelTurn['usage'];
			const pending = new Map<string, { name: string; argsText: string }>();

			try {
				for await (const event of this.model.stream({
					provider: input.provider,
					model,
					system: input.system,
					messages,
					tools: input.tools ?? [],
					maxTokens: input.maxTokens ?? 4096,
					signal,
				})) {
					if (isStopped()) return null;
					if (event.type === 'model_call_delta') content += event.delta;
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
					toolCalls: [...pending].map(([id, toolCall]) => ({
						id,
						name: toolCall.name,
						args: parseToolArgs(toolCall.argsText),
					})),
				};
			} catch (error) {
				if (isStopped()) return null;
				if (attempt >= (input.maxRetries ?? 1)) throw error;
			}
		}

		return { content: '', model: input.model ?? 'default', toolCalls: [] };
	}

	private async *runToolCalls(
		tools: RuntimeTool[],
		toolCalls: Required<RuntimeToolCall>[],
		isStopped: () => boolean
	): AsyncGenerator<RuntimeEvent, RuntimeMessage[] | null> {
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
		const results: RuntimeMessage[] = [];

		for (const toolCall of toolCalls) {
			if (isStopped()) return null;

			yield { type: 'tool_call_start', toolName: toolCall.name, input: toolCall.args };
			const outcome = await runTool(toolMap.get(toolCall.name), toolCall);
			yield { type: 'tool_call_end', toolName: toolCall.name, output: outcome.output };

			results.push({
				role: 'tool',
				toolUseId: toolCall.id,
				content: formatToolOutput(outcome.output),
			});
		}

		return results;
	}
}

function composeMessages(input: RuntimeInput): RuntimeMessage[] {
	const messages = [...(input.messages ?? [])];
	if (input.message) messages.push({ role: 'user', content: input.message });
	return messages;
}

function createSessionId(): string {
	return `runtime-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function runTool(
	tool: RuntimeTool | undefined,
	toolCall: RuntimeToolCall
): Promise<ToolOutcome> {
	if (!tool?.run) {
		return { output: `Error: unknown tool '${toolCall.name}'`, isError: true };
	}

	try {
		return { output: await tool.run(toolCall.args) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { output: `Error: tool '${toolCall.name}' failed: ${message}`, isError: true };
	}
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

function formatToolOutput(output: unknown): string {
	if (typeof output === 'string') return output;
	if (output === undefined) return '';
	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}
