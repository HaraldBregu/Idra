import { AnthropicAdapter } from './anthropic';
import { MistralAdapter } from './mistral';
import { OpenAIAdapter, OpenAIChatAdapter } from './openai';
import type { ProviderAdapter } from './types';

export interface ProviderSpec {
	id: string;
	apiKey: string;
	baseURL?: string;
}

/**
 * Build a {@link ProviderAdapter} from a stored provider record.
 *
 * - anthropic → Anthropic Messages API via @anthropic-ai/sdk
 * - mistral   → Mistral Chat API via @mistralai/mistralai
 * - openai    → OpenAI Responses API via openai SDK (native, supports reasoning)
 * - all others → OpenAI Chat Completions API via openai SDK (compatible endpoint)
 */
export function makeProvider(provider: ProviderSpec): ProviderAdapter {
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
	return new OpenAIChatAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
}
