export interface Provider {
	id: 'openai' | 'anthropic';
	name: 'OpenAI' | 'Anthropic';
	apikey: string;
	url: string;
}
