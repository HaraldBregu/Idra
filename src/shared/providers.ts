import type { Model } from './service';

export interface Provider {
	readonly id: string;
	readonly name: string;
	readonly baseUrl: string;
	readonly apiKey: string;
	readonly capabilities?: string;
}

export type PublicProvider = Omit<Provider, 'apiKey'>;
export type ProviderInput = Provider;

export const DEFAULT_PROVIDERS: readonly Provider[] = [
	{
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech - Image - Video',
	},
	{
		id: 'anthropic',
		name: 'Anthropic',
		baseUrl: 'https://api.anthropic.com',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'google',
		name: 'Google DeepMind / Google',
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech - Image - Video - Music',
	},
	{
		id: 'meta',
		name: 'Meta',
		baseUrl: 'https://ai.meta.com',
		apiKey: '',
		capabilities: 'Chat - Video',
	},
	{
		id: 'xai',
		name: 'xAI',
		baseUrl: 'https://api.x.ai/v1',
		apiKey: '',
		capabilities: 'Chat - Realtime voice - Image - Video',
	},
	{
		id: 'mistral',
		name: 'Mistral AI',
		baseUrl: 'https://api.mistral.ai/v1',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text - Text-to-speech',
	},
	{
		id: 'cohere',
		name: 'Cohere',
		baseUrl: ' ',
		apiKey: '',
		capabilities: 'Chat - Speech-to-text',
	},
	{
		id: 'deepseek',
		name: 'DeepSeek',
		baseUrl: 'https://api.deepseek.com/v1',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'qwen',
		name: 'Alibaba / Qwen / Wan',
		baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
		apiKey: '',
		capabilities: 'Chat - Omni - Image - Video',
	},
	{
		id: 'kimi',
		name: 'Moonshot AI / Kimi',
		baseUrl: 'https://api.moonshot.ai/v1',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'zai',
		name: 'Z.ai / Zhipu AI',
		baseUrl: 'https://api.z.ai/api/paas/v4',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'baidu',
		name: 'Baidu',
		baseUrl: 'https://qianfan.baidubce.com/v2',
		apiKey: '',
		capabilities: 'Chat - Omni - Image',
	},
	{
		id: 'tencent-hunyuan',
		name: 'Tencent Hunyuan',
		baseUrl: 'https://hunyuan.tencent.com',
		apiKey: '',
		capabilities: 'Chat - Image - Video - 3D',
	},
	{
		id: 'bytedance-seed',
		name: 'ByteDance Seed',
		baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
		apiKey: '',
		capabilities: 'Chat - Image - Video - 3D',
	},
	{
		id: 'minimax',
		name: 'MiniMax',
		baseUrl: 'https://api.minimax.io/v1',
		apiKey: '',
		capabilities: 'Chat - Text-to-speech - Video - Music',
	},
	{
		id: 'elevenlabs',
		name: 'ElevenLabs',
		baseUrl: 'https://api.elevenlabs.io/v1',
		apiKey: '',
		capabilities: 'Speech-to-text - Text-to-speech - Audio - Music',
	},
	{
		id: 'deepgram',
		name: 'Deepgram',
		baseUrl: 'https://api.deepgram.com/v1',
		apiKey: '',
		capabilities: 'Speech-to-text - Text-to-speech',
	},
	{
		id: 'cartesia',
		name: 'Cartesia',
		baseUrl: 'https://api.cartesia.ai',
		apiKey: '',
		capabilities: 'Text-to-speech',
	},
	{
		id: 'black-forest-labs',
		name: 'Black Forest Labs',
		baseUrl: 'https://api.bfl.ai/v1',
		apiKey: '',
		capabilities: 'Image',
	},
	{
		id: 'midjourney',
		name: 'Midjourney',
		baseUrl: 'https://www.midjourney.com',
		apiKey: '',
		capabilities: 'Image - Video',
	},
	{
		id: 'adobe-firefly',
		name: 'Adobe Firefly',
		baseUrl: 'https://firefly-api.adobe.io',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
	},
	{
		id: 'kling',
		name: 'Kuaishou / Kling AI',
		baseUrl: 'https://kling.ai',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
	},
	{
		id: 'runway',
		name: 'Runway',
		baseUrl: 'https://api.dev.runwayml.com/v1',
		apiKey: '',
		capabilities: 'Video',
	},
	{
		id: 'luma',
		name: 'Luma AI',
		baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
		apiKey: '',
		capabilities: 'Omni - Image - Video - 3D',
	},
	{
		id: 'stability-ai',
		name: 'Stability AI',
		baseUrl: 'https://api.stability.ai/v2beta',
		apiKey: '',
		capabilities: 'Image - Video - Audio',
	},
	{
		id: 'ideogram',
		name: 'Ideogram',
		baseUrl: 'https://api.ideogram.ai',
		apiKey: '',
		capabilities: 'Image',
	},
	{
		id: 'pika',
		name: 'Pika',
		baseUrl: 'https://pika.art',
		apiKey: '',
		capabilities: 'Video',
	},
	{
		id: 'suno',
		name: 'Suno',
		baseUrl: 'https://suno.com',
		apiKey: '',
		capabilities: 'Music',
	},
	{
		id: 'reka',
		name: 'Reka AI',
		baseUrl: 'https://api.reka.ai/v1',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'ai21',
		name: 'AI21 Labs',
		baseUrl: 'https://api.ai21.com/studio/v1',
		apiKey: '',
		capabilities: 'Chat',
	},
	{
		id: 'perplexity',
		name: 'Perplexity',
		baseUrl: 'https://api.perplexity.ai',
		apiKey: '',
		capabilities: 'Research chat',
	},
	{
		id: 'nvidia',
		name: 'NVIDIA',
		baseUrl: 'https://integrate.api.nvidia.com/v1',
		apiKey: '',
		capabilities: 'Chat',
	},
];

export const DEFAULT_AGENT_MODELS_BY_PROVIDER: Readonly<Record<string, readonly Model[]>> = {
	openai: [
		{ id: 'gpt-5.5', name: 'GPT-5.5' },
		{ id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
		{ id: 'gpt-5.4', name: 'GPT-5.4' },
		{ id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
		{ id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
	],
	anthropic: [
		{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
		{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
		{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
		{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
	],
	google: [
		{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
		{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
		{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
		{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
		{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
	],
	meta: [
		{ id: 'llama-4-maverick', name: 'Llama 4 Maverick' },
		{ id: 'llama-4-scout', name: 'Llama 4 Scout' },
		{ id: 'llama-3.3-70b', name: 'Llama 3.3 70B' },
	],
	xai: [
		{ id: 'grok-4.3', name: 'Grok 4.3' },
		{ id: 'grok-4.3-fast', name: 'Grok 4.3 Fast' },
		{ id: 'grok-code-fast', name: 'Grok Code Fast' },
	],
	mistral: [
		{ id: 'mistral-large-3', name: 'Mistral Large 3' },
		{ id: 'mistral-medium-3.5', name: 'Mistral Medium 3.5' },
		{ id: 'mistral-small-4', name: 'Mistral Small 4' },
		{ id: 'magistral-medium-1.2', name: 'Magistral Medium 1.2' },
		{ id: 'devstral-2', name: 'Devstral 2' },
	],
	cohere: [
		{ id: 'command-a-03-2025', name: 'Command A' },
		{ id: 'command-a-reasoning-08-2025', name: 'Command A Reasoning' },
		{ id: 'command-a-vision-07-2025', name: 'Command A Vision' },
		{ id: 'aya-vision', name: 'Aya Vision' },
	],
	deepseek: [
		{ id: 'deepseek-v4-pro', name: 'DeepSeek V4-Pro' },
		{ id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash' },
		{ id: 'deepseek-v3.2-speciale', name: 'DeepSeek V3.2-Speciale' },
		{ id: 'deepseek-v3.2', name: 'DeepSeek V3.2' },
		{ id: 'deepseek-r1', name: 'DeepSeek R1' },
	],
	qwen: [
		{ id: 'qwen3-max', name: 'Qwen3-Max' },
		{ id: 'qwen3.5-plus', name: 'Qwen3.5-Plus' },
		{ id: 'qwen3.5-omni-plus', name: 'Qwen3.5-Omni-Plus' },
		{ id: 'qwen3-coder', name: 'Qwen3-Coder' },
		{ id: 'qwen3-vl', name: 'Qwen3-VL' },
	],
	kimi: [
		{ id: 'kimi-k2.6', name: 'Kimi K2.6' },
		{ id: 'kimi-k2.5', name: 'Kimi K2.5' },
		{ id: 'kimi-k2', name: 'Kimi K2' },
		{ id: 'kimi-latest', name: 'Kimi Latest' },
	],
	zai: [
		{ id: 'glm-5.1', name: 'GLM-5.1' },
		{ id: 'glm-5', name: 'GLM-5' },
		{ id: 'glm-4.6', name: 'GLM-4.6' },
		{ id: 'glm-4.5v', name: 'GLM-4.5V' },
		{ id: 'glm-z1', name: 'GLM-Z1' },
	],
	baidu: [
		{ id: 'ernie-5.1', name: 'ERNIE 5.1' },
		{ id: 'ernie-5.0', name: 'ERNIE 5.0' },
		{ id: 'ernie-x1.1', name: 'ERNIE X1.1' },
		{ id: 'ernie-4.5', name: 'ERNIE 4.5' },
	],
	'tencent-hunyuan': [
		{ id: 'hy3-preview', name: 'Hy3 Preview' },
	],
	'bytedance-seed': [
		{ id: 'seed2.0-pro', name: 'Seed2.0 Pro' },
		{ id: 'seed2.0-code', name: 'Seed2.0 Code' },
	],
	minimax: [
		{ id: 'minimax-m2.7', name: 'MiniMax M2.7' },
	],
	luma: [
		{ id: 'uni-1', name: 'Uni-1' },
	],
	reka: [
		{ id: 'reka-core', name: 'Reka Core' },
		{ id: 'reka-flash', name: 'Reka Flash' },
		{ id: 'reka-edge', name: 'Reka Edge' },
	],
	ai21: [
		{ id: 'jamba-large', name: 'Jamba Large' },
		{ id: 'jamba-mini', name: 'Jamba Mini' },
		{ id: 'jamba-1.5-large', name: 'Jamba 1.5 Large' },
		{ id: 'jamba-1.5-mini', name: 'Jamba 1.5 Mini' },
	],
	perplexity: [
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
		{ id: 'sonar-pro', name: 'Sonar Pro' },
		{ id: 'sonar-deep-research', name: 'Sonar Deep Research' },
		{ id: 'r1-1776', name: 'R1 1776' },
	],
	nvidia: [
		{ id: 'nemotron-ultra-latest', name: 'Nemotron Ultra / latest' },
		{ id: 'llama-nemotron-super', name: 'Llama Nemotron Super' },
		{ id: 'llama-nemotron-nano', name: 'Llama Nemotron Nano' },
		{ id: 'nemotron-vl', name: 'Nemotron VL' },
	],
} as const;

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getDefaultAgentModels(providerId: string): Model[] {
	return (DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] ?? []).map(
		(model) => ({ ...model })
	);
}

export function hasDefaultAgentModels(providerId: string): boolean {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] !== undefined;
}

function defaultModelsForProvider(providerId: string): readonly Model[] | undefined {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)];
}

export function isAllowedAgentModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	const defaultModels = defaultModelsForProvider(providerId);

	if (defaultModels) {
		return defaultModels.some((model) => model.id === normalizedModelId);
	}

	return true;
}

export function filterSelectableAgentModels(providerId: string, models: Model[]): Model[] {
	const defaultModels = defaultModelsForProvider(providerId);
	if (!defaultModels) {
		return models;
	}

	const byId = new Map(models.map((model) => [model.id.trim(), model]));
	return defaultModels.flatMap((defaultModel) => {
		const model = byId.get(defaultModel.id);
		return model ? [model] : [];
	});
}
