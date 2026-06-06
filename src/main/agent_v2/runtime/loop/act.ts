import { retry } from '../error';
import type { RuntimeModel, RuntimeModelResponse, RuntimePerception } from '../types';

export function act(
	model: RuntimeModel,
	perception: RuntimePerception
): Promise<RuntimeModelResponse> {
	return retry(perception.maxRetries, () =>
		model.generate({
			provider: perception.provider,
			model: perception.model,
			system: perception.prompt.system,
			messages: perception.prompt.messages,
			maxTokens: perception.maxTokens,
			signal: perception.signal,
		})
	);
}
