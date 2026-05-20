import { OpenAIChatAdapter, type OpenAIChatAdapterOptions } from './openai';

const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export class QwenAdapter extends OpenAIChatAdapter {
	constructor(opts: Omit<OpenAIChatAdapterOptions, 'reasoningEffortEnabled'>) {
		super({
			...opts,
			baseURL: opts.baseURL ?? QWEN_BASE_URL,
		});
	}
}
