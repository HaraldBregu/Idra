import {
	filterSelectableAgentModels,
	isAllowedAgentModel,
} from '../../../../src/main/provider/model-policy';
import {
	DEFAULT_AGENT_MODELS_BY_PROVIDER,
	getDefaultAgentModels,
	hasDefaultAgentModels,
} from '../../../../src/shared/providers';
import type { Model } from '../../../../src/shared/service';

describe('provider model policy', () => {
	const models: Model[] = [
		{ id: 'gpt-4o', name: 'GPT-4o' },
		{ id: 'gpt-5.1', name: 'GPT-5.1' },
		{ id: 'gpt-5.5', name: 'GPT-5.5' },
		{ id: 'gpt-5.4', name: 'GPT-5.4' },
		{ id: 'gpt-5.4-mini', name: 'GPT-5.4 mini' },
		{ id: 'text-embedding-3-large', name: 'Embedding' },
	];

	it('limits OpenAI selectable agent models to approved tool-capable models', () => {
		expect(filterSelectableAgentModels('openai', models)).toEqual([
			{ id: 'gpt-5.5', name: 'GPT-5.5' },
			{ id: 'gpt-5.4', name: 'GPT-5.4' },
			{ id: 'gpt-5.4-mini', name: 'GPT-5.4 mini' },
		]);
	});

	it('returns static default frontier models for catalog-backed providers', () => {
		expect(getDefaultAgentModels('openai')).toEqual(DEFAULT_AGENT_MODELS_BY_PROVIDER.openai);
		expect(getDefaultAgentModels('google').map((model) => model.id)).toEqual([
			'gemini-3.1-pro-preview',
			'gemini-3-flash-preview',
			'gemini-2.5-pro',
			'gemini-2.5-flash',
			'gemini-2.5-flash-lite',
		]);
		expect(getDefaultAgentModels('mistral').map((model) => model.id)).toEqual([
			'mistral-large-3',
			'mistral-medium-3.5',
			'mistral-small-4',
			'magistral-medium-1.2',
			'devstral-2',
		]);
		expect(getDefaultAgentModels('xai').map((model) => model.id)).toEqual([
			'grok-4.3',
			'grok-4.3-fast',
			'grok-code-fast',
		]);
		expect(getDefaultAgentModels('perplexity').map((model) => model.id)).toEqual([
			'sonar-reasoning-pro',
			'sonar-pro',
			'sonar-deep-research',
			'r1-1776',
		]);
		expect(getDefaultAgentModels('deepseek').map((model) => model.id)).toEqual([
			'deepseek-v4-pro',
			'deepseek-v4-flash',
			'deepseek-v3.2-speciale',
			'deepseek-v3.2',
			'deepseek-r1',
		]);
	});

	it('returns copies of static default model entries', () => {
		const models = getDefaultAgentModels('openai');
		models[0] = { id: 'changed', name: 'Changed' };

		expect(getDefaultAgentModels('openai')[0]).toEqual({ id: 'gpt-5.5', name: 'GPT-5.5' });
	});

	it('reports whether a provider has static defaults', () => {
		expect(hasDefaultAgentModels('openai')).toBe(true);
		expect(hasDefaultAgentModels('google')).toBe(true);
		expect(hasDefaultAgentModels('custom')).toBe(false);
	});

	it('orders known provider model lists by the static frontier catalog', () => {
		const providerModels: Model[] = [
			{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
			{ id: 'old-google-model', name: 'Old Google Model' },
			{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
			{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
		];

		expect(filterSelectableAgentModels('google', providerModels)).toEqual([
			{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
			{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
			{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
		]);
	});

	it('includes OpenAI pro and mini frontier model defaults', () => {
		expect(getDefaultAgentModels('openai')).toEqual([
			{ id: 'gpt-5.5', name: 'GPT-5.5' },
			{ id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
			{ id: 'gpt-5.4', name: 'GPT-5.4' },
			{ id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
			{ id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
		]);
	});

	it('allows only approved OpenAI agent model ids to be saved', () => {
		expect(isAllowedAgentModel('openai', 'gpt-5.5')).toBe(true);
		expect(isAllowedAgentModel('openai', 'gpt-5.5-pro')).toBe(true);
		expect(isAllowedAgentModel('openai', 'gpt-5.4')).toBe(true);
		expect(isAllowedAgentModel('openai', 'gpt-5.4-pro')).toBe(true);
		expect(isAllowedAgentModel('openai', 'gpt-5.4-mini')).toBe(true);
		expect(isAllowedAgentModel('openai', 'gpt-5.1')).toBe(false);
		expect(isAllowedAgentModel('openai', 'gpt-4o')).toBe(false);
		expect(isAllowedAgentModel('openai', 'text-embedding-3-large')).toBe(false);
	});

	it('limits Anthropic selectable agent models to the top Claude models', () => {
		const anthropicModels: Model[] = [
			{ id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
			{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
			{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
			{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
			{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
		];

		expect(filterSelectableAgentModels('anthropic', anthropicModels)).toEqual([
			{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
			{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
			{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
			{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
			{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
		]);
	});

	it('allows only approved Anthropic agent model ids to be saved', () => {
		expect(isAllowedAgentModel('anthropic', 'claude-opus-4-7')).toBe(true);
		expect(isAllowedAgentModel('anthropic', 'claude-opus-4-6')).toBe(true);
		expect(isAllowedAgentModel('anthropic', 'claude-sonnet-4-6')).toBe(true);
		expect(isAllowedAgentModel('anthropic', 'claude-sonnet-4-5')).toBe(true);
		expect(isAllowedAgentModel('anthropic', 'claude-haiku-4-5')).toBe(true);
		expect(isAllowedAgentModel('anthropic', 'claude-haiku-4-5-20251001')).toBe(false);
		expect(isAllowedAgentModel('anthropic', 'claude-3-5-sonnet-latest')).toBe(false);
	});

	it('allows only static default model ids for catalog-backed non-OpenAI providers', () => {
		expect(isAllowedAgentModel('google', 'gemini-3.1-pro-preview')).toBe(true);
		expect(isAllowedAgentModel('google', 'gemini-1.5-pro')).toBe(false);
		expect(isAllowedAgentModel('mistral', 'mistral-large-3')).toBe(true);
		expect(isAllowedAgentModel('mistral', 'mistral-large-latest')).toBe(false);
		expect(isAllowedAgentModel('deepseek', 'deepseek-v4-pro')).toBe(true);
		expect(isAllowedAgentModel('deepseek', 'deepseek-chat')).toBe(false);
	});

	it('leaves other providers unrestricted', () => {
		expect(filterSelectableAgentModels('custom', models)).toBe(models);
		expect(isAllowedAgentModel('custom', 'local-model')).toBe(true);
	});
});
