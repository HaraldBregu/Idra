import { perceive } from './perceive';
import { parseOutput } from '../parser';
import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeModel,
	RuntimeOutput,
	RuntimeRun,
} from '../types';

export class AgentRuntime {
	constructor(private readonly model: RuntimeModel) {}

	run(input: RuntimeInput): RuntimeRun {
		const controller = new AbortController();
		let stopped = false;
		let stopReason = 'stopped';

		input.signal?.addEventListener('abort', () => {
			stopped = true;
			controller.abort();
		}, { once: true });

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
	): AsyncIterable<RuntimeEvent> {
		const perception = perceive({ ...input, signal });
		let content = '';
		let output: RuntimeOutput = {
			text: '',
			model: perception.model,
			toolCalls: [],
		};

		for (let attempt = 0; attempt <= perception.maxRetries; attempt += 1) {
			try {
				for await (const event of this.model.stream({
					provider: perception.provider,
					model: perception.model,
					system: perception.prompt.system,
					messages: perception.prompt.messages,
					maxTokens: perception.maxTokens,
					signal: perception.signal,
				})) {
					if (isStopped()) {
						yield { type: 'run_stopped', reason: getStopReason() };
						return;
					}
					if (event.type === 'model_call_delta') {
						content += event.delta;
					}
					if (event.type === 'model_call_end') {
						output = {
							...output,
							model: event.model,
							stopReason: event.stopReason,
						};
					}
					yield event;
				}
				break;
			} catch (error) {
				if (isStopped()) {
					yield { type: 'run_stopped', reason: getStopReason() };
					return;
				}
				if (attempt >= perception.maxRetries) {
					throw error;
				}
			}
		}

		const parsed = parseOutput(content);
		output = { ...output, text: parsed.text, toolCalls: parsed.toolCalls };

		for (const toolCall of parsed.toolCalls) {
			const tool = perception.tools.find((entry) => entry.name === toolCall.name);
			yield { type: 'tool_call_start', toolName: toolCall.name, input: toolCall.args };
			yield {
				type: 'tool_call_end',
				toolName: toolCall.name,
				output: tool?.run ? await tool.run(toolCall.args) : undefined,
			};
		}

		yield { type: 'run_finished', result: output };
	}
}
