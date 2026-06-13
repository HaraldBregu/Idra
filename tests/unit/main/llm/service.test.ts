import { ModeSdk } from '../../../../src/main/llm/mode-sdk';
import { LlmService } from '../../../../src/main/llm/service';

describe('LlmService', () => {
	const apiKey = 'test-api-key';

	it('uses one provider handler for supported providers', () => {
		const service = new LlmService();

		expect(service.build({ id: 'openai', apiKey })).toBeInstanceOf(ModeSdk);
		expect(service.build({ id: 'anthropic', apiKey })).toBeInstanceOf(ModeSdk);
		expect(service.build({ id: 'deepseek', apiKey })).toBeInstanceOf(ModeSdk);
	});
});
