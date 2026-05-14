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

	it('limits Anthropic selectable assistant models to the top Claude models', () => {
		const anthropicModels: Model[] = [
			{ id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
			{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
			{ id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
		];

		expect(filterSelectableAssistantModels('anthropic', anthropicModels)).toEqual([
			{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		]);
	});

	it('allows only approved Anthropic assistant model ids to be saved', () => {
		expect(isAllowedAssistantModel('anthropic', 'claude-opus-4-7')).toBe(true);
		expect(isAllowedAssistantModel('anthropic', 'claude-sonnet-4-6')).toBe(true);
		expect(isAllowedAssistantModel('anthropic', 'claude-haiku-4-5-20251001')).toBe(false);
		expect(isAllowedAssistantModel('anthropic', 'claude-3-5-sonnet-latest')).toBe(false);
	});

	it('leaves other providers unrestricted', () => {
		expect(filterSelectableAssistantModels('custom', models)).toBe(models);
		expect(isAllowedAssistantModel('custom', 'local-model')).toBe(true);
	});
});
