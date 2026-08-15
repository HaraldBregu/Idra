export const PROVIDERS = ['anthropic', 'openai', 'deepseek'] as const;

export type ProviderId = (typeof PROVIDERS)[number];

export interface ProviderConfiguration {
	provider: ProviderId;
	model: string;
	apiKey: string;
}

export interface PublicProviderConfiguration {
	configured: boolean;
	provider: ProviderId | null;
	model: string | null;
	hasApiKey: boolean;
}
