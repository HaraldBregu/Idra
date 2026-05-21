export interface ProviderModel {
	id: string;
	name: string;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;
export type ModelCapability =
	| 'llm'
	| 'speech-to-text'
	| 'text-to-speech'
	| 'text-to-image'
	| 'text-to-video'
	| 'music'
	| 'embedding';

export const LLM_MODELS_BY_PROVIDER: ModelCatalog = {
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
		{ id: 'mistral-large-2512', name: 'Mistral Large 3' },
		{ id: 'mistral-large-latest', name: 'Mistral Large Latest' },
		{ id: 'mistral-medium-2604', name: 'Mistral Medium 3.5' },
		{ id: 'mistral-medium-latest', name: 'Mistral Medium Latest' },
		{ id: 'mistral-medium-2508', name: 'Mistral Medium 3.1' },
		{ id: 'mistral-small-2603', name: 'Mistral Small 4' },
		{ id: 'mistral-small-latest', name: 'Mistral Small Latest' },
		{ id: 'ministral-14b-2512', name: 'Ministral 3 14B' },
		{ id: 'ministral-14b-latest', name: 'Ministral 3 14B Latest' },
		{ id: 'ministral-8b-2512', name: 'Ministral 3 8B' },
		{ id: 'ministral-8b-latest', name: 'Ministral 3 8B Latest' },
		{ id: 'ministral-3b-2512', name: 'Ministral 3 3B' },
		{ id: 'ministral-3b-latest', name: 'Ministral 3 3B Latest' },
		{ id: 'magistral-medium-2509', name: 'Magistral Medium 1.2' },
		{ id: 'magistral-medium-latest', name: 'Magistral Medium Latest' },
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
	],
	qwen: [
		{ id: 'qwen3-max', name: 'Qwen3-Max' },
		{ id: 'qwen3.5-plus', name: 'Qwen3.5-Plus' },
		{ id: 'qwen3.5-flash', name: 'Qwen3.5-Flash' },
		{ id: 'qwen3-coder-plus', name: 'Qwen3-Coder-Plus' },
		{ id: 'qwq-plus', name: 'QwQ-Plus' },
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
	'tencent-hunyuan': [{ id: 'hy3-preview', name: 'Hy3 Preview' }],
	'bytedance-seed': [
		{ id: 'seed2.0-pro', name: 'Seed2.0 Pro' },
		{ id: 'seed2.0-code', name: 'Seed2.0 Code' },
	],
	minimax: [{ id: 'minimax-m2.7', name: 'MiniMax M2.7' }],
	luma: [{ id: 'uni-1', name: 'Uni-1' }],
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
};

export const SPEECH_TRANSCRIBER_PROVIDER_ID = 'openai';
export const REALTIME_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-realtime-whisper';
export const SPEECH_TO_TEXT_MODELS = [
	{ id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, name: 'GPT Realtime Whisper' },
] satisfies readonly ProviderModel[];
export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER: ModelCatalog = {
	[SPEECH_TRANSCRIBER_PROVIDER_ID]: SPEECH_TO_TEXT_MODELS,
};

export const TEXT_TO_SPEECH_PROVIDER_ID = 'elevenlabs';
export const TEXT_TO_SPEECH_MODELS = [
	{ id: 'rachel-multilingual', name: 'Rachel - multilingual' },
] satisfies readonly ProviderModel[];
export const TEXT_TO_SPEECH_PROVIDER_MODELS = [
	{ id: 'text-to-speech-provider-coming-soon', name: 'Provider text-to-speech model' },
] satisfies readonly ProviderModel[];
export const TEXT_TO_SPEECH_PROVIDER_IDS = [
	'openai',
	'mistral',
	'minimax',
	'elevenlabs',
	'deepgram',
	'cartesia',
] as const;
export const TEXT_TO_SPEECH_MODELS_BY_PROVIDER: ModelCatalog = {
	...modelsByProviderIds(TEXT_TO_SPEECH_PROVIDER_IDS, TEXT_TO_SPEECH_PROVIDER_MODELS),
	[TEXT_TO_SPEECH_PROVIDER_ID]: TEXT_TO_SPEECH_MODELS,
};

export const IMAGE_CREATOR_MODELS = [
	{ id: 'image-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly ProviderModel[];
export const TEXT_TO_IMAGE_PROVIDER_IDS = [
	'openai',
	'google',
	'xai',
	'qwen',
	'baidu',
	'tencent-hunyuan',
	'bytedance-seed',
	'black-forest-labs',
	'midjourney',
	'adobe-firefly',
	'kling',
	'luma',
	'stability-ai',
	'ideogram',
] as const;
export const TEXT_TO_IMAGE_MODELS_BY_PROVIDER: ModelCatalog = modelsByProviderIds(
	TEXT_TO_IMAGE_PROVIDER_IDS,
	IMAGE_CREATOR_MODELS
);

export const TEXT_TO_VIDEO_MODELS = [
	{ id: 'video-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly ProviderModel[];
export const TEXT_TO_VIDEO_PROVIDER_IDS = [
	'openai',
	'google',
	'meta',
	'xai',
	'qwen',
	'tencent-hunyuan',
	'bytedance-seed',
	'minimax',
	'midjourney',
	'adobe-firefly',
	'kling',
	'runway',
	'luma',
	'stability-ai',
	'pika',
] as const;
export const TEXT_TO_VIDEO_MODELS_BY_PROVIDER: ModelCatalog = modelsByProviderIds(
	TEXT_TO_VIDEO_PROVIDER_IDS,
	TEXT_TO_VIDEO_MODELS
);

export const MUSIC_CREATOR_MODELS = [
	{ id: 'music-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly ProviderModel[];
export const MUSIC_PROVIDER_IDS = ['google', 'minimax', 'elevenlabs', 'suno'] as const;
export const MUSIC_CREATOR_MODELS_BY_PROVIDER: ModelCatalog = modelsByProviderIds(
	MUSIC_PROVIDER_IDS,
	MUSIC_CREATOR_MODELS
);

export const EMBEDDING_MODELS_BY_PROVIDER: ModelCatalog = {};

export const MODEL_CATALOGS_BY_CAPABILITY = {
	llm: LLM_MODELS_BY_PROVIDER,
	'speech-to-text': SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	'text-to-speech': TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	'text-to-image': TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	'text-to-video': TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	music: MUSIC_CREATOR_MODELS_BY_PROVIDER,
	embedding: EMBEDDING_MODELS_BY_PROVIDER,
} as const satisfies Readonly<Record<ModelCapability, ModelCatalog>>;

export function getModelsForProvider(
	catalog: ModelCatalog,
	providerId: string
): ProviderModel[] {
	return cloneModels(catalog[normalizeProviderId(providerId)]);
}

export function getLlmModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(LLM_MODELS_BY_PROVIDER, providerId);
}

export function getSpeechToTextModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(SPEECH_TO_TEXT_MODELS_BY_PROVIDER, providerId);
}

export function getTextToSpeechModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_SPEECH_MODELS_BY_PROVIDER, providerId);
}

export function getTextToImageModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_IMAGE_MODELS_BY_PROVIDER, providerId);
}

export function getTextToVideoModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_VIDEO_MODELS_BY_PROVIDER, providerId);
}

export function getMusicModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(MUSIC_CREATOR_MODELS_BY_PROVIDER, providerId);
}

export function getEmbeddingModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(EMBEDDING_MODELS_BY_PROVIDER, providerId);
}

export function getModelsByCapability(
	capability: ModelCapability,
	providerId: string
): ProviderModel[] {
	return getModelsForProvider(MODEL_CATALOGS_BY_CAPABILITY[capability], providerId);
}

function modelsByProviderIds(
	providerIds: readonly string[],
	models: readonly ProviderModel[]
): ModelCatalog {
	return providerIds.reduce<Record<string, readonly ProviderModel[]>>((catalog, providerId) => {
		catalog[providerId] = models;
		return catalog;
	}, {});
}

function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[] {
	return (models ?? []).map((model) => ({ ...model }));
}

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}
