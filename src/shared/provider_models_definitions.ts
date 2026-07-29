import type { ModelCatalog, ProviderModel, ProviderModelStatus, SpeechToTextApiType, SpeechToTextProviderId } from './provider_models_types';

export const MODEL_CAPABILITIES = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-video',
	'text-to-audio',
	'embedding',
] as const;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

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

export const TEXT_TO_SPEECH_PROVIDER_IDS = [
	'cartesia',
	'deepgram',
	'elevenlabs',
	'google',
	'minimax',
	'mistral',
	'openai',
] as const;

export const EMBEDDING_PROVIDER_IDS = [
	'bge',
	'cohere',
	'jina',
	'nomic',
	'openai',
	'voyage',
] as const;

export const DEFAULT_EMBEDDING_PROVIDER_ID = 'openai';

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

export const MUSIC_PROVIDER_IDS = [
	'elevenlabs',
	'google',
	'kling',
	'minimax',
	'stability-ai',
	'suno',
] as const;
