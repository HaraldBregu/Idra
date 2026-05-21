import {
	filterSelectableAgentModels,
	isAllowedAgentModel,
	DEFAULT_AGENT_MODELS_BY_PROVIDER,
	DEFAULT_PROVIDERS,
	getDefaultAgentModels,
	getProviderApiConfigurationUrl,
	hasDefaultAgentModels,
	hasDefaultProviderCapability,
	providerHasCapability,
	providerHasImageCapability,
	PROVIDER_API_CONFIGURATIONS,
} from '../../../../src/shared/providers';
import {
	getModelReasoningEfforts,
	isModelReasoningEffortSupported,
	MODEL_REASONING_EFFORTS,
	type Model,
} from '../../../../src/shared/service';

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
			'mistral-large-2512',
			'mistral-large-latest',
			'mistral-medium-2604',
			'mistral-medium-latest',
			'mistral-medium-2508',
			'mistral-small-2603',
			'mistral-small-latest',
			'ministral-14b-2512',
			'ministral-14b-latest',
			'ministral-8b-2512',
			'ministral-8b-latest',
			'ministral-3b-2512',
			'ministral-3b-latest',
			'magistral-medium-2509',
			'magistral-medium-latest',
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
		]);
	});

	it('lists every provider from the frontier catalog in the shared provider defaults', () => {
		expect(DEFAULT_PROVIDERS).toHaveLength(25);
		expect(DEFAULT_PROVIDERS.map((provider) => provider.id)).toEqual([
			'openai',
			'anthropic',
			'google',
			'meta',
			'xai',
			'mistral',
			'deepseek',
			'qwen',
			'kimi',
			'zai',
			'minimax',
			'elevenlabs',
			'deepgram',
			'cartesia',
			'black-forest-labs',
			'midjourney',
			'kling',
			'runway',
			'luma',
			'stability-ai',
			'ideogram',
			'pika',
			'suno',
			'reka',
			'perplexity',
		]);
	});

	it('includes API setup configuration metadata for every default provider', () => {
		const apiConfigurations = PROVIDER_API_CONFIGURATIONS as Readonly<Record<string, unknown>>;

		for (const provider of DEFAULT_PROVIDERS) {
			expect(apiConfigurations[provider.id]).toBeDefined();
			expect(provider.apiConfiguration).toBe(apiConfigurations[provider.id]);
			expect(getProviderApiConfigurationUrl(provider)).toMatch(/^https:\/\//);
		}
	});

	it('resolves provider API setup URLs from key pages, docs, or provider fallback sites', () => {
		const openai = DEFAULT_PROVIDERS.find((provider) => provider.id === 'openai');
		const midjourney = DEFAULT_PROVIDERS.find((provider) => provider.id === 'midjourney');
		const suno = DEFAULT_PROVIDERS.find((provider) => provider.id === 'suno');

		expect(openai?.apiConfiguration?.apiKeyManagementUrl).toBe(
			'https://platform.openai.com/api-keys'
		);
		expect(openai?.apiConfiguration?.recommendedEnvVars).toContain('OPENAI_API_KEY');
		expect(openai ? getProviderApiConfigurationUrl(openai) : '').toBe(
			'https://platform.openai.com/api-keys'
		);
		expect(midjourney?.apiConfiguration?.apiKeyManagementUrl).toBeNull();
		expect(midjourney ? getProviderApiConfigurationUrl(midjourney) : '').toBe(
			'https://docs.midjourney.com/hc/en-us'
		);
		expect(suno?.apiConfiguration?.apiKeyManagementUrl).toBeNull();
		expect(suno?.apiConfiguration?.configurationDocsUrl).toBeNull();
		expect(suno ? getProviderApiConfigurationUrl(suno) : '').toBe('https://suno.com');
	});

	it('includes chat-capable defaults for additional catalog providers', () => {
		expect(getDefaultAgentModels('qwen').map((model) => model.id)).toEqual([
			'qwen3-max',
			'qwen3.5-plus',
			'qwen3.5-flash',
			'qwen3-coder-plus',
			'qwq-plus',
		]);
		expect(getDefaultAgentModels('kimi').map((model) => model.id)).toEqual([
			'kimi-k2.6',
			'kimi-k2.5',
			'kimi-k2',
			'kimi-latest',
		]);
		expect(getDefaultAgentModels('reka').map((model) => model.id)).toEqual([
			'reka-core',
			'reka-flash',
			'reka-edge',
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
		expect(hasDefaultAgentModels('qwen')).toBe(true);
		expect(hasDefaultAgentModels('elevenlabs')).toBe(false);
		expect(hasDefaultAgentModels('custom')).toBe(false);
	});

	it('matches provider capabilities as catalog tokens', () => {
		const openai = DEFAULT_PROVIDERS.find((provider) => provider.id === 'openai');
		const bfl = DEFAULT_PROVIDERS.find((provider) => provider.id === 'black-forest-labs');
		const anthropic = DEFAULT_PROVIDERS.find((provider) => provider.id === 'anthropic');

		expect(openai ? providerHasCapability(openai, 'Speech-to-text') : false).toBe(true);
		expect(openai ? providerHasImageCapability(openai) : false).toBe(true);
		expect(bfl ? providerHasImageCapability(bfl) : false).toBe(true);
		expect(anthropic ? providerHasImageCapability(anthropic) : true).toBe(false);
		expect(hasDefaultProviderCapability('stability-ai', 'Image')).toBe(true);
		expect(hasDefaultProviderCapability('deepseek', 'Image')).toBe(false);
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
		expect(isAllowedAgentModel('mistral', 'mistral-large-2512')).toBe(true);
		expect(isAllowedAgentModel('mistral', 'mistral-large-latest')).toBe(true);
		expect(isAllowedAgentModel('mistral', 'mistral-large-3')).toBe(false);
		expect(isAllowedAgentModel('deepseek', 'deepseek-v4-pro')).toBe(true);
		expect(isAllowedAgentModel('deepseek', 'deepseek-v4-flash')).toBe(true);
		expect(isAllowedAgentModel('deepseek', 'deepseek-chat')).toBe(false);
		expect(isAllowedAgentModel('deepseek', 'deepseek-reasoner')).toBe(false);
		expect(isAllowedAgentModel('deepseek', 'deepseek-r1')).toBe(false);
	});

	it('returns no selectable main-agent models for known providers without catalogs', () => {
		expect(filterSelectableAgentModels('elevenlabs', models)).toEqual([]);
		expect(isAllowedAgentModel('elevenlabs', 'rachel-multilingual')).toBe(false);
	});

	it('leaves custom providers unrestricted', () => {
		expect(filterSelectableAgentModels('custom', models)).toBe(models);
		expect(isAllowedAgentModel('custom', 'local-model')).toBe(true);
	});

	it('limits saved reasoning effort metadata to OpenAI providers', () => {
		expect(getModelReasoningEfforts('gpt-5.5', 'openai')).toEqual(MODEL_REASONING_EFFORTS);
		expect(getModelReasoningEfforts('gpt-5.4-mini', 'openai')).toEqual([
			'none',
			'low',
			'medium',
			'high',
			'xhigh',
		]);
		expect(getModelReasoningEfforts('deepseek-v4-pro', 'deepseek')).toEqual([]);
		expect(isModelReasoningEffortSupported('deepseek-v4-pro', 'high', 'deepseek')).toBe(false);
	});
});
