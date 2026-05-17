import { AnthropicAdapter } from './anthropic';
import { OpenAIAdapter } from './openai';
import type { ProviderAdapter } from './types';

export interface ProviderSpec {
	id: string;
	apiKey: string;
	baseURL?: string;
}

/**
 * Build a {@link ProviderAdapter} from a stored provider record.
 * Anthropic uses its own wire format; every other provider (OpenAI,
 * Google, Mistral, Groq, xAI, Together, Perplexity, DeepSeek, Ollama …)
 * uses the OpenAI-compatible API.
 */
export function makeProvider(provider: ProviderSpec): ProviderAdapter {
	if (provider.id.toLowerCase() === 'anthropic') {
		return new AnthropicAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}
	return new OpenAIAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
}
