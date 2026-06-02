import { OpenAIChatAdapter, type OpenAIChatAdapterOptions } from './openai';

const LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';

export class LMStudioAdapter extends OpenAIChatAdapter {
	constructor(opts: OpenAIChatAdapterOptions) {
		super({
			...opts,
			baseURL: opts.baseURL ?? LM_STUDIO_BASE_URL,
		});
	}
}
