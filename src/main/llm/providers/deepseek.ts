import { OpenAIChatAdapter, type OpenAIChatAdapterOptions } from './openai';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export class DeepSeekAdapter extends OpenAIChatAdapter {
	constructor(
		opts: Omit<
			OpenAIChatAdapterOptions,
			'reasoningEffortEnabled' | 'reasoningContentEnabled' | 'thinkingModeEnabled'
		>
	) {
		super({
			...opts,
			baseURL: opts.baseURL ?? DEEPSEEK_BASE_URL,
			reasoningEffortEnabled: true,
			reasoningContentEnabled: true,
			thinkingModeEnabled: true,
		});
	}
}
