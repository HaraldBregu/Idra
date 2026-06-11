import { LlmService } from '../../../../src/main/llm/service';
import { AnthropicAdapter } from '../../../../src/main/llm/providers/anthropic';
import { OpenAIChatAdapter } from '../../../../src/main/llm/providers/generic';
import { OpenAIAdapter } from '../../../../src/main/llm/providers/openai';

describe('LlmService', () => {
	const apiKey = 'test-api-key';

	it('routes supported providers to their adapters', () => {
		const service = new LlmService();

		expect(service.build({ id: 'openai', apiKey })).toBeInstanceOf(OpenAIAdapter);
		expect(service.build({ id: 'anthropic', apiKey })).toBeInstanceOf(AnthropicAdapter);
		expect(service.build({ id: 'deepseek', apiKey })).toBeInstanceOf(OpenAIChatAdapter);
	});
});
