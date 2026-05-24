import { model, normalizeProviderId, type ModelCatalog } from './models';

export const SPEECH_TRANSCRIBER_PROVIDER_ID = 'openai';
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

export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER = {
	deepgram: [model('nova-3', 'Nova 3'), model('flux', 'Flux')],
	elevenlabs: [
		model(ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID, 'Scribe v2'),
		model(ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Scribe v2 Realtime'),
	],
	mistral: [
		model(MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini 2602'),
		model(MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID, 'Voxtral Mini Transcribe Realtime 2602'),
	],
	openai: [
		model(GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Transcribe'),
		model(MINI_SPEECH_TRANSCRIBER_MODEL_ID, 'GPT-4o Mini Transcribe'),
	],
	qwen: [
		model(QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3.5 Omni'),
		model(QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID, 'Qwen3 Omni Flash'),
	],
	xai: [
		model(XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID, 'xAI STT Batch'),
		model(XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID, 'xAI STT Streaming'),
	],
} as const satisfies ModelCatalog;

export const STT_MODELS_BY_PROVIDER = SPEECH_TO_TEXT_MODELS_BY_PROVIDER;
export const SPEECH_TO_TEXT_MODELS = SPEECH_TO_TEXT_MODELS_BY_PROVIDER[SPEECH_TRANSCRIBER_PROVIDER_ID];
export const SPEECH_TO_TEXT_PROVIDER_IDS = [
	'deepgram',
	'elevenlabs',
	'mistral',
	'openai',
	'qwen',
	'xai',
] as const;

export function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean {
	const provider = normalizeProviderId(providerId);
	const model = modelId.trim();
	if (provider === SPEECH_TRANSCRIBER_PROVIDER_ID) {
		return (SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(model);
	}
	if (provider === 'elevenlabs') return model === ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	if (provider === 'mistral') return model === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID;
	if (provider === 'qwen') {
		return (
			model === QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID ||
			model === QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID
		);
	}
	if (provider === 'xai') return model === XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID;
	return false;
}
