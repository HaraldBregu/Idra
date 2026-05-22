export type ProviderModelStatus = 'active' | 'deprecated' | 'verify';

export interface ProviderModel {
	readonly id: string;
	readonly name: string;
	readonly status: ProviderModelStatus;
}

export type ModelCatalog = Readonly<Record<string, readonly ProviderModel[]>>;

export const MODEL_CAPABILITIES = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-video',
	'text-to-audio',
	'music',
	'3d',
	'embedding',
] as const;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

export const LLM_MODELS_BY_PROVIDER = {
	openai: [model('gpt-5.5', 'GPT-5.5'), model('gpt-5.4-mini', 'GPT-5.4 Mini')],
	anthropic: [
		model('claude-opus-4-7', 'Claude Opus 4.7'),
		model('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
	],
	google: [
		model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview'),
		model('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite'),
	],
	meta: [
		model('muse-spark', 'Muse Spark'),
		model('llama-4-maverick', 'Llama 4 Maverick'),
		model('llama-4-scout', 'Llama 4 Scout'),
	],
	xai: [model('grok-4.3', 'Grok 4.3'), model('grok-build-0.1', 'Grok Build 0.1')],
	mistral: [
		model('mistral-large-2512', 'Mistral Large 2512'),
		model('mistral-medium-3-5', 'Mistral Medium 3.5'),
		model('devstral-2512', 'Devstral 2512'),
	],
	deepseek: [
		model('deepseek-v4-pro', 'DeepSeek V4 Pro'),
		model('deepseek-v4-flash', 'DeepSeek V4 Flash'),
	],
	qwen: [
		model('qwen3.7-max', 'Qwen3.7 Max'),
		model('qwen3.6-plus', 'Qwen3.6 Plus'),
		model('qwen3.6-flash', 'Qwen3.6 Flash'),
	],
	kimi: [
		model('kimi-k2.6', 'Kimi K2.6'),
		model('kimi-k2.5', 'Kimi K2.5'),
		model('kimi-k2-thinking', 'Kimi K2 Thinking'),
	],
	zai: [
		model('glm-5.1', 'GLM-5.1'),
		model('glm-5', 'GLM-5'),
		model('glm-5-turbo', 'GLM-5 Turbo'),
	],
	minimax: [model('MiniMax-M2.7', 'MiniMax M2.7'), model('MiniMax-M2.5', 'MiniMax M2.5')],
	reka: [model('reka-flash', 'Reka Flash'), model('reka-edge-2603', 'Reka Edge 2603')],
} as const satisfies ModelCatalog;

export const RESEARCH_CHAT_MODELS_BY_PROVIDER = {
	perplexity: [
		model('sonar-deep-research', 'Sonar Deep Research'),
		model('sonar-reasoning-pro', 'Sonar Reasoning Pro'),
		model('sonar-pro', 'Sonar Pro'),
		model('sonar', 'Sonar'),
	],
} as const satisfies ModelCatalog;

export const CHAT_MODELS_BY_PROVIDER = mergeModelCatalogs(
	LLM_MODELS_BY_PROVIDER,
	RESEARCH_CHAT_MODELS_BY_PROVIDER
);

export const SPEECH_TRANSCRIBER_PROVIDER_ID = 'openai';
export const REALTIME_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-transcribe';
export const MINI_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-mini-transcribe';
export const SPEECH_TRANSCRIBER_MODEL_IDS = [
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
] as const;
export const MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID = 'voxtral-mini-2602';
export const MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID =
	'voxtral-mini-transcribe-realtime-2602';
export const QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID = 'qwen3.5-omni';
export const QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID = 'qwen3-omni-flash';

export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER = {
	openai: [
		model(REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Transcribe'),
		model(MINI_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Mini Transcribe'),
	],
	deepgram: [model('nova-3', 'Nova 3'), model('flux', 'Flux')],
	elevenlabs: [model('scribe_v2', 'Scribe v2'), model('scribe_v2_realtime', 'Scribe v2 Realtime')],
	mistral: [
		model(MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini 2602'),
		model(MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini Transcribe Realtime 2602'),
	],
	xai: [model('xai-stt-batch', 'xAI STT Batch'), model('xai-stt-streaming', 'xAI STT Streaming')],
	qwen: [
		model(QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3.5 Omni'),
		model(QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3 Omni Flash'),
	],
} as const satisfies ModelCatalog;

export const STT_MODELS_BY_PROVIDER = SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
export const SPEECH_TO_TEXT_MODELS = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[SPEECH_TRANSCRIBER_PROVIDER_ID];
export const SPEECH_TO_TEXT_PROVIDER_IDS = [
	'openai',
	'deepgram',
	'elevenlabs',
	'mistral',
	'xai',
	'qwen',
] as const;

export const TEXT_TO_SPEECH_PROVIDER_ID = 'elevenlabs';

export const TEXT_TO_SPEECH_MODELS_BY_PROVIDER = {
	elevenlabs: [
		model('eleven_v3', 'Eleven v3'),
		model('eleven_multilingual_v2', 'Eleven Multilingual v2'),
		model('eleven_flash_v2_5', 'Eleven Flash v2.5'),
	],
	cartesia: [model('sonic-3.5', 'Sonic 3.5'), model('sonic-3', 'Sonic 3')],
	openai: [model('gpt-4o-mini-tts', 'GPT-4o Mini TTS'), model('tts-1-hd', 'TTS-1 HD')],
	google: [model('gemini-3.1-flash-tts-preview', 'Gemini 3.1 Flash TTS Preview')],
	minimax: [model('Speech-2.8-HD', 'Speech 2.8 HD'), model('Speech-2.8-Turbo', 'Speech 2.8 Turbo')],
	mistral: [model('voxtral-tts-2603', 'Voxtral TTS 2603')],
	deepgram: [model('aura-2', 'Aura 2')],
} as const satisfies ModelCatalog;

export const TTS_MODELS_BY_PROVIDER = TEXT_TO_SPEECH_MODELS_BY_PROVIDER;
export const TEXT_TO_SPEECH_MODELS =
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER[TEXT_TO_SPEECH_PROVIDER_ID];
export const TEXT_TO_SPEECH_PROVIDER_IDS = [
	'elevenlabs',
	'cartesia',
	'openai',
	'google',
	'minimax',
	'mistral',
	'deepgram',
] as const;

export const REALTIME_VOICE_MODELS_BY_PROVIDER = {
	openai: [model('gpt-realtime-2', 'GPT Realtime 2'), model('gpt-realtime', 'GPT Realtime')],
	xai: [model('grok-voice-latest', 'Grok Voice Latest')],
	google: [model('gemini-3.1-flash-live-preview', 'Gemini 3.1 Flash Live Preview')],
	qwen: [
		model('qwen-omni-realtime', 'Qwen Omni Realtime'),
		model('qwen3.5-omni', 'Qwen3.5 Omni'),
		model('qwen3-omni-flash', 'Qwen3 Omni Flash'),
	],
	luma: [model('uni-1.1', 'Uni 1.1')],
} as const satisfies ModelCatalog;

export const TEXT_TO_IMAGE_MODELS_BY_PROVIDER = {
	openai: [
		model('gpt-image-2', 'GPT Image 2'),
		model('gpt-image-1.5', 'GPT Image 1.5'),
		model('gpt-image-1-mini', 'GPT Image 1 Mini'),
	],
	google: [
		model('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview'),
		model('gemini-3-pro-image-preview', 'Gemini 3 Pro Image Preview'),
	],
	qwen: [model('qwen-image', 'Qwen Image'), model('qwen-image-edit', 'Qwen Image Edit')],
	xai: [model('grok-imagine', 'Grok Imagine')],
	'black-forest-labs': [
		model('FLUX.2', 'FLUX.2'),
		model('FLUX.1 Kontext [pro]', 'FLUX.1 Kontext [pro]'),
		model('FLUX1.1 [pro] Ultra', 'FLUX1.1 [pro] Ultra'),
	],
	midjourney: [
		model('midjourney-v8.1', 'Midjourney v8.1'),
		model('midjourney-v7', 'Midjourney v7'),
	],
	luma: [model('uni-1.1', 'Uni 1.1')],
	'stability-ai': [
		model('stable-image-ultra', 'Stable Image Ultra'),
		model('stable-image-core', 'Stable Image Core'),
	],
	ideogram: [model('ideogram-3.0', 'Ideogram 3.0'), model('ideogram-2a', 'Ideogram 2a')],
} as const satisfies ModelCatalog;

export const IMAGE_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_IMAGE_MODELS_BY_PROVIDER;
export const IMAGE_CREATOR_MODELS = TEXT_TO_IMAGE_MODELS_BY_PROVIDER.openai;
export const TEXT_TO_IMAGE_PROVIDER_IDS = [
	'openai',
	'google',
	'qwen',
	'xai',
	'black-forest-labs',
	'midjourney',
	'luma',
	'stability-ai',
	'ideogram',
] as const;

export const TEXT_TO_VIDEO_MODELS_BY_PROVIDER = {
	google: [model('veo-3.1', 'Veo 3.1'), model('veo-3.1-fast', 'Veo 3.1 Fast')],
	runway: [
		model('gen4.5', 'Gen 4.5'),
		model('gen4_turbo', 'Gen 4 Turbo'),
		model('gen4_aleph', 'Gen 4 Aleph'),
	],
	luma: [model('ray3.14', 'Ray 3.14'), model('ray3', 'Ray 3'), model('ray2', 'Ray 2')],
	minimax: [
		model('MiniMax-Hailuo-2.3', 'MiniMax Hailuo 2.3'),
		model('MiniMax-Hailuo-2.3-Fast', 'MiniMax Hailuo 2.3 Fast'),
		model('MiniMax-Hailuo-02', 'MiniMax Hailuo 02'),
	],
	qwen: [
		model('wan2.7-t2v', 'Wan 2.7 Text-to-Video'),
		model('wan2.7-i2v', 'Wan 2.7 Image-to-Video'),
		model('wan2.7-video-edit', 'Wan 2.7 Video Edit'),
	],
	xai: [model('grok-imagine-video', 'Grok Imagine Video')],
	openai: [model('sora-2-pro', 'Sora 2 Pro', 'deprecated'), model('sora-2', 'Sora 2', 'deprecated')],
	meta: [model('movie-gen-video', 'Movie Gen Video', 'verify')],
	midjourney: [model('midjourney-video', 'Midjourney Video')],
	pika: [
		model('pika-2.5', 'Pika 2.5'),
		model('pika-pro', 'Pika Pro'),
		model('pika-turbo', 'Pika Turbo'),
	],
	'stability-ai': [model('stable-video', 'Stable Video')],
	kling: [model('kling-2.6', 'Kling 2.6', 'verify'), model('kling-2.1', 'Kling 2.1', 'verify')],
} as const satisfies ModelCatalog;

export const VIDEO_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_VIDEO_MODELS_BY_PROVIDER;
export const TEXT_TO_VIDEO_MODELS = TEXT_TO_VIDEO_MODELS_BY_PROVIDER.google;
export const TEXT_TO_VIDEO_PROVIDER_IDS = [
	'google',
	'runway',
	'luma',
	'minimax',
	'qwen',
	'xai',
	'openai',
	'meta',
	'midjourney',
	'pika',
	'stability-ai',
	'kling',
] as const;

export const TEXT_TO_AUDIO_MODELS_BY_PROVIDER = {
	google: [
		model('lyria-3-pro-preview', 'Lyria 3 Pro Preview'),
		model('lyria-3-clip-preview', 'Lyria 3 Clip Preview'),
		model('lyria-realtime', 'Lyria Realtime'),
	],
	suno: [model('suno-v5.5', 'Suno v5.5'), model('suno-v4.5-all', 'Suno v4.5 All')],
	minimax: [model('music-2.6', 'Music 2.6'), model('music-cover', 'Music Cover')],
	elevenlabs: [
		model('eleven-music', 'Eleven Music'),
		model('elevenlabs-sound-effects', 'ElevenLabs Sound Effects'),
	],
	'stability-ai': [model('stable-audio-2.5', 'Stable Audio 2.5')],
	kling: [model('kling-audio', 'Kling Audio', 'verify')],
} as const satisfies ModelCatalog;

export const MUSIC_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_CREATOR_MODELS = TEXT_TO_AUDIO_MODELS_BY_PROVIDER.google;
export const MUSIC_PROVIDER_IDS = [
	'google',
	'suno',
	'minimax',
	'elevenlabs',
	'stability-ai',
	'kling',
] as const;

export const THREE_D_MODELS_BY_PROVIDER = {
	luma: [model('genie', 'Genie', 'verify'), model('interactive-scenes', 'Interactive Scenes', 'verify')],
} as const satisfies ModelCatalog;

export const EMBEDDING_MODELS_BY_PROVIDER: ModelCatalog = {};

export const MODEL_CATALOGS_BY_CAPABILITY = {
	llm: LLM_MODELS_BY_PROVIDER,
	'research-chat': RESEARCH_CHAT_MODELS_BY_PROVIDER,
	'speech-to-text': SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	'text-to-speech': TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	'realtime-voice': REALTIME_VOICE_MODELS_BY_PROVIDER,
	'text-to-image': TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	'text-to-video': TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	'text-to-audio': TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	music: MUSIC_CREATOR_MODELS_BY_PROVIDER,
	'3d': THREE_D_MODELS_BY_PROVIDER,
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

export function getResearchChatModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(RESEARCH_CHAT_MODELS_BY_PROVIDER, providerId);
}

export function getSpeechToTextModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(SPEECH_TO_TEXT_MODELS_BY_PROVIDER, providerId);
}

export function getTextToSpeechModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_SPEECH_MODELS_BY_PROVIDER, providerId);
}

export function getRealtimeVoiceModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(REALTIME_VOICE_MODELS_BY_PROVIDER, providerId);
}

export function getTextToImageModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_IMAGE_MODELS_BY_PROVIDER, providerId);
}

export function getTextToVideoModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_VIDEO_MODELS_BY_PROVIDER, providerId);
}

export function getTextToAudioModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(TEXT_TO_AUDIO_MODELS_BY_PROVIDER, providerId);
}

export function getMusicModelsByProvider(providerId: string): ProviderModel[] {
	return getTextToAudioModelsByProvider(providerId);
}

export function getThreeDModelsByProvider(providerId: string): ProviderModel[] {
	return getModelsForProvider(THREE_D_MODELS_BY_PROVIDER, providerId);
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

function model(
	id: string,
	name: string,
	status: ProviderModelStatus = 'active'
): ProviderModel {
	return { id, name, status };
}

function mergeModelCatalogs(...catalogs: readonly ModelCatalog[]): ModelCatalog {
	return catalogs.reduce<Record<string, readonly ProviderModel[]>>((merged, catalog) => {
		for (const [providerId, models] of Object.entries(catalog)) {
			merged[providerId] = [...(merged[providerId] ?? []), ...models];
		}
		return merged;
	}, {});
}

function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[] {
	return (models ?? []).map((model) => ({ ...model }));
}

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}
