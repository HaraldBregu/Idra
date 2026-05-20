import { OpenAIChatAdapter } from './openai';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export class DeepSeekAdapter extends OpenAIChatAdapter {
	constructor(opts: { apiKey: string; baseURL?: string }) {
		super({
			apiKey: opts.apiKey,
			baseURL: opts.baseURL ?? DEEPSEEK_BASE_URL,
			reasoningEffortEnabled: true,
		});
	}
}
