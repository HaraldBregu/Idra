import type { ProviderConfiguration, PublicProviderConfiguration } from './types';

export function publicProvider(
	configuration: ProviderConfiguration | undefined
): PublicProviderConfiguration {
	return configuration
		? {
				configured: true,
				provider: configuration.provider,
				model: configuration.model,
				hasApiKey: true,
			}
		: { configured: false, provider: null, model: null, hasApiKey: false };
}
