import { AnthropicAdapter } from './anthropic';
import { OpenAIAdapter } from './openai';
import type { ProviderAdapter } from './types';

export type ProviderKind = 'openai' | 'anthropic';

export function pickProviderForModel(model: string): ProviderKind {
	const m = model.toLowerCase();
	if (m.startsWith('claude') || m.startsWith('anthropic')) return 'anthropic';
	if (m.startsWith('gpt') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')) {
		return 'openai';
	}
	if (m.startsWith('o')) return 'openai';
	return 'openai';
}

export interface ProviderSpec {
	id: string;
	apiKey: string;
	baseURL?: string;
}

/**
 * Build a {@link ProviderAdapter} from a stored provider record and the
 * chosen model. The `provider.id` decides the wire format; `model` is only
 * used as a hint when the provider id is ambiguous.
 */
export function makeProvider(provider: ProviderSpec, model: string): ProviderAdapter {
	const id = provider.id.toLowerCase();
	if (id === 'anthropic') {
		return new AnthropicAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}
	if (id === 'openai') {
		return new OpenAIAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
	}
	// Unknown stored id — fall back to model-based detection.
	return pickProviderForModel(model) === 'anthropic'
		? new AnthropicAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL })
		: new OpenAIAdapter({ apiKey: provider.apiKey, baseURL: provider.baseURL });
}
