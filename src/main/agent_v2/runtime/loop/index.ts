import { perceive } from './perceive';
import { observe } from './observe';
import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeMessage,
	RuntimeModel,
	RuntimePerception,
	RuntimeRun,
	RuntimeTool,
	RuntimeToolCall,
} from '../types';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
}

interface ToolOutcome {
	output: unknown;
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
		const perception = perceive({ ...input, signal });
		const messages: RuntimeMessage[] = [...perception.prompt.messages];
		let finalText = '';
		let lastModel = perception.model;
		let lastStopReason: string | undefined;

		for (let iteration = 0; iteration < perception.maxIterations; iteration += 1) {
			if (isStopped()) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			const turn = yield* this.runModelTurn(perception, messages, signal, isStopped);
			if (turn === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			const output = observe({
				content: turn.content,
				model: turn.model,
				stopReason: turn.stopReason,
			});
			lastModel = output.model;
			lastStopReason = output.stopReason;
			if (output.text) finalText = finalText ? `${finalText}\n${output.text}` : output.text;

			// Record the assistant turn (raw content keeps the tool-call request in context).
			messages.push({ role: 'assistant', content: turn.content });

			if (output.toolCalls.length === 0) {
				yield {
					type: 'run_finished',
					result: {
						text: finalText,
						model: lastModel,
						toolCalls: [],
						stopReason: lastStopReason ?? 'end_turn',
					},
				};
				return;
			}

			const results = yield* this.runToolCalls(perception.tools, output.toolCalls, isStopped);
			if (results === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			// Feed tool results back so the next turn can observe them and continue.
			messages.push({ role: 'user', content: results });
		}

		yield {
			type: 'run_finished',
			result: {
				text: finalText,
				model: lastModel,
				toolCalls: [],
				stopReason: 'max_iterations',
			},
		};
	}

	private async *runModelTurn(
		perception: RuntimePerception,
		messages: RuntimeMessage[],
		signal: AbortSignal,
		isStopped: () => boolean
	): AsyncGenerator<RuntimeEvent, ModelTurn | null> {
		for (let attempt = 0; attempt <= perception.maxRetries; attempt += 1) {
			// Reset per attempt so a failed attempt never bleeds into the retry.
			let content = '';
			let model = perception.model;
			let stopReason: string | undefined;
			try {
				for await (const event of this.model.stream({
					provider: perception.provider,
					model: perception.model,
					system: perception.prompt.system,
					messages,
					maxTokens: perception.maxTokens,
					signal,
				})) {
					if (isStopped()) return null;
					if (event.type === 'model_call_delta') content += event.delta;
					if (event.type === 'model_call_end') {
						model = event.model;
						stopReason = event.stopReason;
					}
					yield event;
				}
				return { content, model, stopReason };
			} catch (error) {
				if (isStopped()) return null;
				if (attempt >= perception.maxRetries) throw error;
			}
		}
		// Unreachable: the final attempt either returns or rethrows above.
		return { content: '', model: perception.model };
	}

	private async *runToolCalls(
		tools: RuntimeTool[],
		toolCalls: RuntimeToolCall[],
		isStopped: () => boolean
	): AsyncGenerator<RuntimeEvent, string | null> {
		const summaries: string[] = [];
		for (const toolCall of toolCalls) {
			if (isStopped()) return null;
			const tool = tools.find((entry) => entry.name === toolCall.name);
			yield { type: 'tool_call_start', toolName: toolCall.name, input: toolCall.args };
			const outcome = await runTool(tool, toolCall);
			yield { type: 'tool_call_end', toolName: toolCall.name, output: outcome.output };
			summaries.push(`${toolCall.name}: ${formatToolOutput(outcome.output)}`);
		}
		return ['Tool results:', ...summaries].join('\n');
	}
}

async function runTool(
	tool: RuntimeTool | undefined,
	toolCall: RuntimeToolCall
): Promise<ToolOutcome> {
	if (!tool?.run) {
		return { output: `Tool "${toolCall.name}" is not available.` };
	}
	try {
		return { output: await tool.run(toolCall.args) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { output: `Tool "${toolCall.name}" failed: ${message}` };
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
