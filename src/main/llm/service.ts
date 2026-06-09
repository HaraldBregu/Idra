import { Service } from 'typedi';
import { AnthropicAdapter } from './providers/anthropic';
import {
	DeepSeekAdapter,
	MistralAdapter,
	QwenAdapter,
} from './providers/custom';
import { LMStudioAdapter } from './providers/lmstudio';
import { OllamaAdapter } from './providers/ollama';
import { OpenAIAdapter, OpenAIChatAdapter } from './providers/openai';
import type { ProviderAdapter, ProviderSpec } from './types';

@Service()
export class LlmService {
	build(provider: ProviderSpec): ProviderAdapter {
		const id = provider.id.toLowerCase();
		if (id === 'anthropic') {
			return new AnthropicAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'mistral' || id === 'mistal') {
			return new MistralAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'openai') {
			return new OpenAIAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'deepseek') {
			return new DeepSeekAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'qwen') {
			return new QwenAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'ollama') {
			return new OllamaAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		if (id === 'lmstudio' || id === 'lm-studio') {
			return new LMStudioAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
		}
		return new OpenAIChatAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}
}
