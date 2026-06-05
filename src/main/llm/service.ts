import { makeProvider, type ProviderSpec } from './router';
import type { ProviderAdapter } from './types';

export class LlmService {
	createProvider(provider: ProviderSpec): ProviderAdapter {
		return makeProvider(provider);
	}
}
