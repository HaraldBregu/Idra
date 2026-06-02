import { OpenAIChatAdapter, type OpenAIChatAdapterOptions } from './OpenAIClient';

const OLLAMA_BASE_URL = 'http://localhost:11434/v1';

export class OllamaAdapter extends OpenAIChatAdapter {
	constructor(opts: OpenAIChatAdapterOptions) {
		super({
			...opts,
			baseURL: opts.baseURL ?? OLLAMA_BASE_URL,
		});
	}
}
