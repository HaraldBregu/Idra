export const DEFAULT_PROVIDERS = [
	{ id: 'openai', name: 'OpenAI' },
	{ id: 'anthropic', name: 'Anthropic' },
	{ id: 'google', name: 'Google' },
	{ id: 'mistral', name: 'Mistral' },
	{ id: 'groq', name: 'Groq' },
	{ id: 'openrouter', name: 'OpenRouter' },
	{ id: 'ollama', name: 'Ollama' },
] as const;

export type DefaultProvider = (typeof DEFAULT_PROVIDERS)[number];
