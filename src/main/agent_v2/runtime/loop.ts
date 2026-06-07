import { AgentModel } from '../model';
import { createRuntimeSession } from './session';
import { runModelTurn } from './turn';
import { runToolCalls } from './tools';
import type { RuntimeEvent, RuntimeInput, RuntimeModel, RuntimeRun } from '../types';

/**
 * Orchestrates one agent run from prompt to final result.
 *
 * The runtime owns the loop lifecycle: it starts a session, asks the model for a
 * turn, records assistant output, executes requested tools, feeds tool results
 * back into the transcript, and repeats until the model returns no tool calls or
 * the configured turn limit is reached.
 */
export class AgentRuntime {
	constructor(private readonly model: RuntimeModel = new AgentModel()) {}

	/**
	 * Starts a cancellable runtime stream for a fully specified agent input.
	 *
	 * Callers receive model events, assistant/user turn events, tool events, and a
	 * final run result through `RuntimeRun.stream`. Calling `stop()` aborts the
	 * model request and causes the stream to yield a `run_stopped` event.
	 */
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
