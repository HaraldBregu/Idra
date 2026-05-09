export interface Provider {
	readonly id: string;
	readonly name: string;
	readonly baseUrl: string;
	readonly apiKey: string;
}

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
		name: 'Google',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		apiKey: '',
	},
	{
		id: 'mistral',
		name: 'Mistral',
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
		id: 'openrouter',
		name: 'OpenRouter',
		baseUrl: 'https://openrouter.ai/api/v1',
		apiKey: '',
	},
	{
		id: 'ollama',
		name: 'Ollama',
		baseUrl: 'http://localhost:11434/v1',
		apiKey: '',
	},
];

export type DefaultProvider = (typeof DEFAULT_PROVIDERS)[number];
