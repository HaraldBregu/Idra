import type { ProviderId } from './types';

export function providerBaseUrl(provider: ProviderId): string {
	if (provider === 'anthropic') return 'https://api.anthropic.com';
	if (provider === 'openai') return 'https://api.openai.com/v1';
	return 'https://api.deepseek.com';
}
