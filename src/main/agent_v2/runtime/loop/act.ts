import { retry } from '../recovery';
import type { RuntimeModel, RuntimeModelResponse, RuntimePerception } from '../types';

export function act(
	model: RuntimeModel,
	perception: RuntimePerception
): Promise<RuntimeModelResponse> {
	return retry(perception.maxRetries, () =>
		model.generate({
			model: perception.model,
			system: perception.prompt.system,
			prompt: perception.prompt.prompt,
			messages: perception.prompt.messages,
			maxTokens: perception.maxTokens,
			signal: perception.signal,
		})
	);
}
