import { model, normalizeProviderId, type ModelCatalog } from './models';

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
export type SpeechToTextProviderId = (typeof SPEECH_TO_TEXT_PROVIDER_IDS)[number];

export const DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID = 'nova-3';
export const DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID = 'flux';
export const GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-transcribe';
export const MINI_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-4o-mini-transcribe';
export const SPEECH_TRANSCRIBER_MODEL_IDS = [
	GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
] as const;
export const LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS = [] as const;
export const MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID = 'voxtral-mini-2602';
export const MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID =
	'voxtral-mini-transcribe-realtime-2602';
export const QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID = 'qwen3.5-omni';
export const QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID = 'qwen3-omni-flash';
export const ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID = 'scribe_v2';
export const ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID = 'scribe_v2_realtime';
export const XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID = 'xai-stt-batch';
export const XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID = 'xai-stt-streaming';

export const SPEECH_TO_TEXT_BATCH_API_TYPE = 'batch';
export const SPEECH_TO_TEXT_STREAM_API_TYPE = 'stream';
export const SPEECH_TO_TEXT_API_TYPES = [
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
] as const;
export type SpeechToTextApiType = (typeof SPEECH_TO_TEXT_API_TYPES)[number];

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
	],
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: [
		model(QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3.5 Omni'),
		model(QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3 Omni Flash'),
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
		[ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [
			SPEECH_TO_TEXT_STREAM_API_TYPE,
		],
	},
	[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID]: [
			SPEECH_TO_TEXT_BATCH_API_TYPE,
			SPEECH_TO_TEXT_STREAM_API_TYPE,
		],
		[MINI_SPEECH_TRANSCRIBER_MODEL_ID]: [
			SPEECH_TO_TEXT_BATCH_API_TYPE,
			SPEECH_TO_TEXT_STREAM_API_TYPE,
		],
	},
	[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
		[QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
	[XAI_SPEECH_TO_TEXT_PROVIDER_ID]: {
		[XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
		[XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
	},
} as const satisfies Readonly<
	Record<SpeechToTextProviderId, Readonly<Record<string, readonly SpeechToTextApiType[]>>>
>;

export const STT_MODELS_BY_PROVIDER = SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
export const SPEECH_TO_TEXT_MODELS = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[SPEECH_TRANSCRIBER_PROVIDER_ID];

function resolveSpeechToTextProviderId(providerId: string): SpeechToTextProviderId | null {
	const normalizedProviderId = normalizeProviderId(providerId);
	return (SPEECH_TO_TEXT_PROVIDER_IDS as readonly string[]).includes(normalizedProviderId)
		? (normalizedProviderId as SpeechToTextProviderId)
		: null;
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
	if (provider === SPEECH_TRANSCRIBER_PROVIDER_ID) {
		return (SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(model);
	}
	if (provider === ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	}
	if (provider === QWEN_SPEECH_TO_TEXT_PROVIDER_ID) {
		return (
			model === QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID ||
			model === QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID
		);
	}
	if (provider === XAI_SPEECH_TO_TEXT_PROVIDER_ID) {
		return model === XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID;
	}
	return false;
}
