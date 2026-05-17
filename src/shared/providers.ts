export interface Provider {
	readonly id: string;
	readonly name: string;
	readonly baseUrl: string;
	readonly apiKey: string;
}

export type PublicProvider = Omit<Provider, 'apiKey'>;
export type ProviderInput = Provider;

export const DEFAULT_PROVIDERS: readonly Provider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		apiKey: '',
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		baseUrl: 'https://api.anthropic.com',
		apiKey: '',
	},
	{
		id: 'google',
		name: 'Google AI',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		apiKey: '',
	},
	{
		id: 'mistral',
		name: 'Mistral AI',
		baseUrl: 'https://api.mistral.ai/v1',
		apiKey: '',
	},
	{
		id: 'groq',
		name: 'Groq',
		baseUrl: 'https://api.groq.com/openai/v1',
		apiKey: '',
	},
	{
		id: 'xai',
		name: 'xAI',
		baseUrl: 'https://api.x.ai/v1',
		apiKey: '',
	},
	{
		id: 'together',
		name: 'Together AI',
		baseUrl: 'https://api.together.xyz/v1',
		apiKey: '',
	},
	{
		id: 'perplexity',
		name: 'Perplexity AI',
		baseUrl: 'https://api.perplexity.ai',
		apiKey: '',
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		baseUrl: 'https://api.deepseek.com/v1',
		apiKey: '',
	},
	{
		id: 'ollama',
		name: 'Ollama',
		baseUrl: 'http://localhost:11434/v1',
		apiKey: '',
	},
];
