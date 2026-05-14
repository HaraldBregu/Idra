import {
	filterSelectableAssistantModels,
	isAllowedAssistantModel,
} from '../../../../src/main/provider/model-policy';
import type { Model } from '../../../../src/shared/service';

describe('provider model policy', () => {
	const models: Model[] = [
		{ id: 'gpt-4o', name: 'GPT-4o' },
		{ id: 'gpt-5.1', name: 'GPT-5.1' },
		{ id: 'gpt-5.5', name: 'GPT-5.5' },
		{ id: 'gpt-5.4-mini', name: 'GPT-5.4 mini' },
		{ id: 'text-embedding-3-large', name: 'Embedding' },
	];

	it('limits OpenAI selectable assistant models to approved tool-capable models', () => {
		expect(filterSelectableAssistantModels('openai', models)).toEqual([
			{ id: 'gpt-5.5', name: 'GPT-5.5' },
			{ id: 'gpt-5.4-mini', name: 'GPT-5.4 mini' },
			{ id: 'gpt-5.1', name: 'GPT-5.1' },
		]);
	});

	it('allows only approved OpenAI assistant model ids to be saved', () => {
		expect(isAllowedAssistantModel('openai', 'gpt-5.5')).toBe(true);
		expect(isAllowedAssistantModel('openai', 'gpt-4o')).toBe(false);
		expect(isAllowedAssistantModel('openai', 'text-embedding-3-large')).toBe(false);
	});

	it('leaves non-OpenAI providers unrestricted', () => {
		expect(filterSelectableAssistantModels('anthropic', models)).toBe(models);
		expect(isAllowedAssistantModel('anthropic', 'claude-opus-4-5')).toBe(true);
	});
});
