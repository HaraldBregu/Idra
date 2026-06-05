import { parseOutput } from './parser';
import { composePrompt } from './prompt';
import { retry } from './retry';
import { routeModel } from './routing';
import type { RuntimeInput, RuntimeModel, RuntimeOutput } from './types';

export class AgentRuntime {
	constructor(private readonly model: RuntimeModel) {}

	async run(input: RuntimeInput): Promise<RuntimeOutput> {
		const prompt = composePrompt(input);
		const model = routeModel(input);
		const response = await retry(input.maxRetries ?? 1, () =>
			this.model.generate({
				model,
				system: prompt.system,
				prompt: prompt.prompt,
				messages: prompt.messages,
				maxTokens: input.maxTokens ?? 4096,
				signal: input.signal,
			})
		);
		const output = parseOutput(response.text);

		return {
			text: output.text,
			toolCalls: output.toolCalls,
			model: response.model,
			stopReason: response.stopReason,
		};
	}
}
