import { LlmService } from '../../../../src/main/llm/service';

describe('LlmService', () => {
	const apiKey = 'test-api-key';

	it('uses one provider handler for supported providers', () => {
		const service = new LlmService();

		expect(service.build({ id: 'openai', apiKey })).toBeInstanceOf(LlmService);
		expect(service.build({ id: 'anthropic', apiKey })).toBeInstanceOf(LlmService);
		expect(service.build({ id: 'deepseek', apiKey })).toBeInstanceOf(LlmService);
	});
});
