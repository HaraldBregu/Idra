import { Service } from 'typedi';
import { AnthropicAdapter } from './providers/anthropic';
import { OpenAIAdapter, OpenAIChatAdapter } from './providers/openai';
import type { ProviderAdapter, ProviderSpec } from './types';

@Service()
export class LlmService {
	build(provider: ProviderSpec): ProviderAdapter {
		const id = provider.id.toLowerCase();
		if (id === 'anthropic') {
			return new AnthropicAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'openai') {
			return new OpenAIAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		return new OpenAIChatAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}
}
