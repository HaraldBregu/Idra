import { composePrompt } from '../prompt';
import { routeModel } from '../routing';
import type { RuntimeInput, RuntimePerception } from '../types';

export function perceive(input: RuntimeInput): RuntimePerception {
	return {
		prompt: composePrompt(input),
		provider: input.provider,
		model: routeModel(input),
		maxTokens: input.maxTokens ?? 4096,
		maxRetries: input.maxRetries ?? 1,
		signal: input.signal,
	};
}
