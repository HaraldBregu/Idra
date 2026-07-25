import type { ModelCatalog, ProviderModel, ProviderModelStatus, SpeechToTextApiType, SpeechToTextProviderId } from './provider_models_types';

export const MODEL_CAPABILITIES = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-audio',
	'music',
] as const;

export function model(
	id: string,
	name: string,
	status: ProviderModelStatus = 'active'
): ProviderModel {
	return { id, name, status };
}

export function mergeModelCatalogs(...catalogs: readonly ModelCatalog[]): ModelCatalog {
	return catalogs.reduce<Record<string, readonly ProviderModel[]>>((merged, catalog) => {
		for (const [providerId, models] of Object.entries(catalog)) {
			merged[providerId] = [...(merged[providerId] ?? []), ...models];
		}
		return merged;
	}, {});
}

export function cloneModels(models: readonly ProviderModel[] | undefined): ProviderModel[] {
	return (models ?? []).map((model) => ({ ...model }));
}

export function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export const LLM_MODELS_BY_PROVIDER = {
	anthropic: [
		model('claude-fable-5', 'Claude Fable 5'),
		model('claude-opus-5', 'Claude Opus 5'),
		model('claude-sonnet-5', 'Claude Sonnet 5'),
		model('claude-opus-4-7', 'Claude Opus 4.7'),
		model('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
		model('claude-haiku-4-5-20251001', 'Claude Haiku 4.5 20251001'),
	],
	deepseek: [
		model('deepseek-v4-pro', 'DeepSeek V4 Pro'),
		model('deepseek-v4-flash', 'DeepSeek V4 Flash'),
	],
	google: [
		model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview'),
		model('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite'),
	],
	kimi: [
		model('kimi-k2.6', 'Kimi K2.6'),
		model('kimi-k2.5', 'Kimi K2.5'),
		model('kimi-k2-thinking', 'Kimi K2 Thinking'),
	],
	minimax: [model('MiniMax-M2.7', 'MiniMax M2.7'), model('MiniMax-M2.5', 'MiniMax M2.5')],
	mistral: [
		model('mistral-large-2512', 'Mistral Large 2512'),
		model('mistral-medium-3-5', 'Mistral Medium 3.5'),
		model('devstral-2512', 'Devstral 2512'),
	],
	openai: [
		model('gpt-5.6-sol', 'GPT-5.6 Sol'),
		model('gpt-5.6-terra', 'GPT-5.6 Terra'),
		model('gpt-5.6-luna', 'GPT-5.6 Luna'),
		model('gpt-5.5', 'GPT-5.5'),
		model('gpt-5.5-pro', 'GPT-5.5 Pro'),
		model('gpt-5.4', 'GPT-5.4'),
		model('gpt-5.4-pro', 'GPT-5.4 Pro'),
		model('gpt-5.4-mini', 'GPT-5.4 Mini'),
		model('gpt-5.4-nano', 'GPT-5.4 Nano'),
	],
	qwen: [
		model('qwen3.7-max', 'Qwen3.7 Max'),
		model('qwen3.6-plus', 'Qwen3.6 Plus'),
		model('qwen3.6-flash', 'Qwen3.6 Flash'),
	],
	reka: [model('reka-flash', 'Reka Flash'), model('reka-edge-2603', 'Reka Edge 2603')],
	xai: [model('grok-4.3', 'Grok 4.3'), model('grok-build-0.1', 'Grok Build 0.1')],
	zai: [
		model('glm-5.1', 'GLM-5.1'),
		model('glm-5', 'GLM-5'),
		model('glm-5-turbo', 'GLM-5 Turbo'),
	],
} as const satisfies ModelCatalog;

export const LLM_PROVIDERS = Object.keys(LLM_MODELS_BY_PROVIDER);

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


export const DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID = 'deepgram';
export const ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID = 'elevenlabs';
export const MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID = 'mistral';
export const OPENAI_SPEECH_TO_TEXT_PROVIDER_ID = 'openai';
export const QWEN_SPEECH_TO_TEXT_PROVIDER_ID = 'qwen';
export const XAI_SPEECH_TO_TEXT_PROVIDER_ID = 'xai';
export const SPEECH_TRANSCRIBER_PROVIDER_ID = OPENAI_SPEECH_TO_TEXT_PROVIDER_ID;
export const SPEECH_TO_TEXT_PROVIDER_IDS = [
	DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
	ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
	MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
	XAI_SPEECH_TO_TEXT_PROVIDER_ID,
] as const;

export const DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID = 'nova-3';
export const DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID = 'flux-general-en';
export const GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-transcribe';
export const MINI_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-mini-transcribe';
export const OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID = 'gpt-realtime-whisper';
export const SPEECH_TRANSCRIBER_MODEL_IDS = [
	GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
] as const;
export const LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS = [] as const;
export const MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID = 'voxtral-mini-latest';
export const MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID = 'voxtral-mini-transcribe-realtime-2602';
export const QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID = 'qwen3-asr-flash-realtime';
export const ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID = 'scribe_v2';
export const ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID = 'scribe_v2_realtime';
export const XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID = 'xai-stt-batch';
export const XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID = 'xai-stt-streaming';

export const SPEECH_TO_TEXT_PROVIDER_BASE_URLS = {
	[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: 'https://api.deepgram.com/v1',
	[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: 'https://api.elevenlabs.io/v1',
	[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: 'https://api.mistral.ai/v1',
	[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: 'https://api.openai.com/v1',
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime',
	[XAI_SPEECH_TO_TEXT_PROVIDER_ID]: 'https://api.x.ai/v1',
} as const satisfies Readonly<Record<SpeechToTextProviderId, string>>;

export const SPEECH_TO_TEXT_PROVIDER_SAMPLE_RATES = {
	[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: 24_000,
	[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: 16_000,
	[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: 16_000,
	[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: 24_000,
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: 16_000,
	[XAI_SPEECH_TO_TEXT_PROVIDER_ID]: 24_000,
} as const satisfies Readonly<Record<SpeechToTextProviderId, number>>;

export const SPEECH_TO_TEXT_BATCH_API_TYPE = 'batch';
export const SPEECH_TO_TEXT_STREAM_API_TYPE = 'stream';
export const SPEECH_TO_TEXT_API_TYPES = [
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
] as const;

export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER = {
	[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID, 'Nova 3'),
		model(DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID, 'Flux'),
	],
	[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID, 'Scribe v2'),
		model(ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Scribe v2 Realtime'),
	],
	[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini 2602'),
		model(MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini Transcribe Realtime 2602'),
	],
	[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Transcribe'),
		model(MINI_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Mini Transcribe'),
		model(OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'GPT Realtime Whisper'),
	],
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3 ASR Flash Realtime'),
	],
	[XAI_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID, 'xAI STT Batch'),
		model(XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID, 'xAI STT Streaming'),
	],
} as const satisfies ModelCatalog;

export const SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER = {
	[DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID]: [
			SPEECH_TO_TEXT_BATCH_API_TYPE,
			SPEECH_TO_TEXT_STREAM_API_TYPE,
		],
		[DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[MINI_SPEECH_TRANSCRIBER_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[XAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
} as const satisfies Readonly<
	Record<SpeechToTextProviderId, Readonly<Record<string, readonly SpeechToTextApiType[]>>>
>;

export const STT_MODELS_BY_PROVIDER = SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
export const SPEECH_TO_TEXT_MODELS =
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER[SPEECH_TRANSCRIBER_PROVIDER_ID];

function resolveSpeechToTextProviderId(providerId: string): SpeechToTextProviderId | null {
	const normalizedProviderId = normalizeProviderId(providerId);
	return (SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalizedProviderId)
		? (normalizedProviderId as SpeechToTextProviderId)
		: null;
}

export function isSpeechToTextProviderId(providerId: string): providerId is SpeechToTextProviderId {
	return resolveSpeechToTextProviderId(providerId) !== null;
}

export function getSpeechToTextModelApiTypes(
	providerId: string,
	modelId: string
): readonly SpeechToTextApiType[] {
	const provider = resolveSpeechToTextProviderId(providerId);
	if (!provider) return [];
	return SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER[provider][modelId.trim()] ?? [];
}

export function supportsSpeechToTextModelApiType(
	providerId: string,
	modelId: string,
	apiType: SpeechToTextApiType
): boolean {
	return getSpeechToTextModelApiTypes(providerId, modelId).includes(apiType);
}

export function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean {
	const provider = normalizeProviderId(providerId);
	const model = modelId.trim();
	if (provider === DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === SPEECH_TRANSCRIBER_PROVIDER_ID) {
		return model === OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === QWEN_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === XAI_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID;
	}
	return false;
}

export const TEXT_TO_SPEECH_PROVIDER_ID = 'elevenlabs';

export const TEXT_TO_SPEECH_MODELS_BY_PROVIDER = {
	cartesia: [model('sonic-3.5', 'Sonic 3.5'), model('sonic-3', 'Sonic 3')],
	deepgram: [model('aura-2', 'Aura 2')],
	elevenlabs: [
		model('eleven_v3', 'Eleven v3'),
		model('eleven_multilingual_v2', 'Eleven Multilingual v2'),
		model('eleven_flash_v2_5', 'Eleven Flash v2.5'),
	],
	google: [model('gemini-3.1-flash-tts-preview', 'Gemini 3.1 Flash TTS Preview')],
	minimax: [model('speech-2.8-hd', 'Speech 2.8 HD'), model('speech-2.8-turbo', 'Speech 2.8 Turbo')],
	mistral: [model('voxtral-mini-tts-2603', 'Voxtral Mini TTS 2603')],
	openai: [model('gpt-4o-mini-tts', 'GPT-4o Mini TTS'), model('tts-1-hd', 'TTS-1 HD')],
} as const satisfies ModelCatalog;

export const TTS_MODELS_BY_PROVIDER = TEXT_TO_SPEECH_MODELS_BY_PROVIDER;
export const TEXT_TO_SPEECH_MODELS =
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER[TEXT_TO_SPEECH_PROVIDER_ID];
export const TEXT_TO_SPEECH_PROVIDER_IDS = [
	'cartesia',
	'deepgram',
	'elevenlabs',
	'google',
	'minimax',
	'mistral',
	'openai',
] as const;

export const TEXT_TO_IMAGE_MODELS_BY_PROVIDER = {
	'black-forest-labs': [
		model('FLUX.2', 'FLUX.2'),
		model('FLUX.1 Kontext [pro]', 'FLUX.1 Kontext [pro]'),
		model('FLUX1.1 [pro] Ultra', 'FLUX1.1 [pro] Ultra'),
	],
	google: [
		model('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image Preview'),
		model('gemini-3-pro-image-preview', 'Gemini 3 Pro Image Preview'),
	],
	ideogram: [model('ideogram-3.0', 'Ideogram 3.0'), model('ideogram-2a', 'Ideogram 2a')],
	luma: [model('uni-1.1', 'Uni 1.1')],
	midjourney: [
		model('midjourney-v8.1', 'Midjourney v8.1'),
		model('midjourney-v7', 'Midjourney v7'),
	],
	qwen: [model('qwen-image', 'Qwen Image'), model('qwen-image-edit', 'Qwen Image Edit')],
	'stability-ai': [
		model('stable-image-ultra', 'Stable Image Ultra'),
		model('stable-image-core', 'Stable Image Core'),
	],
	xai: [
		model('grok-imagine-image', 'Grok Imagine Image'),
		model('grok-imagine-image-quality', 'Grok Imagine Image Quality'),
	],
} as const satisfies ModelCatalog;

export const IMAGE_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_IMAGE_MODELS_BY_PROVIDER;
export const IMAGE_CREATOR_MODELS = TEXT_TO_IMAGE_MODELS_BY_PROVIDER.google;
export const TEXT_TO_IMAGE_PROVIDER_IDS = [
	'black-forest-labs',
	'google',
	'ideogram',
	'luma',
	'midjourney',
	'qwen',
	'stability-ai',
	'xai',
] as const;

export const TEXT_TO_VIDEO_MODELS_BY_PROVIDER = {
	google: [model('veo-3.1', 'Veo 3.1'), model('veo-3.1-fast', 'Veo 3.1 Fast')],
	kling: [
		model('kling-v2.5-turbo', 'Kling v2.5 Turbo'),
		model('kling-v2.1-master', 'Kling v2.1 Master'),
	],
	luma: [model('ray-3', 'Ray 3'), model('ray-2', 'Ray 2')],
	midjourney: [model('midjourney-video-v1', 'Midjourney Video v1')],
	minimax: [
		model('MiniMax-Hailuo-2.3', 'Hailuo 2.3'),
		model('MiniMax-Hailuo-02', 'Hailuo 02'),
	],
	pika: [model('pika-2.2', 'Pika 2.2')],
	qwen: [model('wan2.5-t2v', 'Wan 2.5 T2V'), model('wan2.2-t2v-plus', 'Wan 2.2 T2V Plus')],
	runway: [model('gen4_turbo', 'Gen-4 Turbo'), model('gen3a_turbo', 'Gen-3 Alpha Turbo')],
	xai: [model('grok-imagine-video-1.5', 'Grok Imagine Video 1.5')],
} as const satisfies ModelCatalog;

export const VIDEO_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_VIDEO_MODELS_BY_PROVIDER;
export const TEXT_TO_VIDEO_PROVIDER_IDS = [
	'google',
	'kling',
	'luma',
	'midjourney',
	'minimax',
	'pika',
	'qwen',
	'runway',
	'xai',
] as const;

export const TEXT_TO_AUDIO_MODELS_BY_PROVIDER = {
	elevenlabs: [
		model('eleven-music', 'Eleven Music'),
		model('elevenlabs-sound-effects', 'ElevenLabs Sound Effects'),
	],
	google: [
		model('lyria-3-pro-preview', 'Lyria 3 Pro Preview'),
		model('lyria-3-clip-preview', 'Lyria 3 Clip Preview'),
		model('lyria-realtime', 'Lyria Realtime'),
	],
	kling: [model('kling-audio', 'Kling Audio')],
	minimax: [model('music-2.6', 'Music 2.6'), model('music-cover', 'Music Cover')],
	'stability-ai': [model('stable-audio-2.5', 'Stable Audio 2.5')],
	suno: [model('suno-v5.5', 'Suno v5.5'), model('suno-v4.5-all', 'Suno v4.5 All')],
} as const satisfies ModelCatalog;

export const MUSIC_CREATOR_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_MODELS_BY_PROVIDER = TEXT_TO_AUDIO_MODELS_BY_PROVIDER;
export const MUSIC_CREATOR_MODELS = TEXT_TO_AUDIO_MODELS_BY_PROVIDER.google;
export const MUSIC_PROVIDER_IDS = [
	'elevenlabs',
	'google',
	'kling',
	'minimax',
	'stability-ai',
	'suno',
] as const;

export const REALTIME_VOICE_MODELS_BY_PROVIDER = {
	google: [model('gemini-3.1-flash-live-preview', 'Gemini 3.1 Flash Live Preview')],
	luma: [model('uni-1.1', 'Uni 1.1')],
	qwen: [
		model('qwen-omni-realtime', 'Qwen Omni Realtime'),
		model('qwen3.5-omni', 'Qwen3.5 Omni'),
		model('qwen3-omni-flash', 'Qwen3 Omni Flash'),
	],
	xai: [model('grok-voice-latest', 'Grok Voice Latest')],
} as const satisfies ModelCatalog;

export function isRealtimeVoiceModel(providerId: string, modelId: string): boolean {
	const catalog = REALTIME_VOICE_MODELS_BY_PROVIDER as Readonly<Record<string, readonly { readonly id: string }[]>>;
	return (catalog[normalizeProviderId(providerId)] ?? []).some((m) => m.id === modelId);
}
