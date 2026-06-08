import { AgentModel } from '../model';
import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeMessage,
	RuntimeModel,
	RuntimeRun,
	RuntimeTool,
	RuntimeToolCall,
} from './types';
import { createRuntimeSession } from '../session';
import { SystemPrompt } from '../prompt';
import { parseToolArgs } from '../shared/args';
import { formatToolOutput } from '../shared/format';
import { runTool } from '../tool';

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

async function* runModelTurn(
	modelPort: RuntimeModel,
	input: RuntimeInput,
	system: string | undefined,
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
			for await (const event of modelPort.stream({
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

export class AgentRuntime {
	constructor(private readonly model: RuntimeModel = new AgentModel()) {}

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
		const session = createRuntimeSession(input);

		yield { type: 'run_started', sessionId: session.id, model: session.model };

		while (true) {
			if (isStopped()) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			const turn = yield* runModelTurn(this.model, input, session.messages, signal, isStopped);
			if (turn === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			session.model = turn.model;
			session.stopReason = turn.stopReason;
			session.usage.inputTokens += turn.usage?.inputTokens ?? 0;
			session.usage.outputTokens += turn.usage?.outputTokens ?? 0;
			if (turn.content) session.finalText = turn.content;

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			session.messages.push({
				role: 'assistant',
				content: turn.content,
				toolCalls: turn.toolCalls,
			});

			if (turn.toolCalls.length === 0) {
				yield {
					type: 'run_finished',
					result: {
						text: session.finalText,
						model: session.model,
						toolCalls: session.toolCalls,
						numTurns: session.numTurns,
						subtype: 'success',
						sessionId: session.id,
						stopReason: session.stopReason ?? 'end_turn',
						usage: session.usage,
					},
				};
				return;
			}

			if (session.numTurns >= session.maxTurns) {
				yield {
					type: 'run_finished',
					result: {
						text: '',
						model: session.model,
						toolCalls: session.toolCalls,
						numTurns: session.numTurns,
						subtype: 'error_max_turns',
						sessionId: session.id,
						stopReason: session.stopReason,
						usage: session.usage,
					},
				};
				return;
			}

			const results = yield* runToolCalls(input.tools ?? [], turn.toolCalls, isStopped);
			if (results === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}
			session.toolCalls.push(...turn.toolCalls);
			session.messages.push(...results);
			session.numTurns += 1;
			yield { type: 'user_message', messages: results };
		}
	}
}

async function* runToolCalls(
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