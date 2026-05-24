import {
	DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
	DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
	ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
	GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
	IMAGE_CREATOR_MODELS_BY_PROVIDER,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
	MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	SPEECH_TO_TEXT_BATCH_API_TYPE,
	SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_PROVIDER_MODELS,
	SPEECH_TO_TEXT_STREAM_API_TYPE,
	TEXT_TO_IMAGE_PROVIDER_MODELS,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_MODELS,
	TEXT_TO_VIDEO_PROVIDER_MODELS,
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	getModelsByCapability,
	getMusicModelsByProvider,
	getSpeechToTextModelApiTypes,
	getSpeechToTextModelsByProvider,
	getTextToImageModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
	isRealtimeSpeechToTextModel,
	supportsSpeechToTextModelApiType,
	XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
	XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID,
} from '../../../../src/shared/provider-models';
import {
	getMusicModels,
	getSpeechToTextModels,
	getTextToImageModels,
	getTextToSpeechModels,
	getTextToVideoModels,
} from '../../../../src/shared/models';
import { getModelsByCapability as getSharedModelsByCapabilityFromProviders } from '../../../../src/shared/providers';
import {
	isAllowedMusicCreatorModel,
	isAllowedSpeechToTextModel,
	isAllowedTextToSpeechModel,
	isAllowedTextToVideoModel,
} from '../../../../src/shared/service';
import {
	SPEECH_TO_TEXT_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
} from '../../../../src/shared/providers';

describe('provider model catalogs', () => {
	it('returns speech-to-text models by provider', () => {
	expect(getSpeechToTextModelsByProvider('openai')).toEqual(SPEECH_TO_TEXT_MODELS);
	expect(SPEECH_TO_TEXT_PROVIDER_MODELS).toEqual(SPEECH_TO_TEXT_MODELS_BY_PROVIDER);
	expect(getSpeechToTextModelsByProvider('google')).toEqual([]);
	expect(getSpeechToTextModelsByProvider('xai')).toEqual(SPEECH_TO_TEXT_MODELS_BY_PROVIDER.xai);
	expect(getSpeechToTextModelsByProvider('mistral')).toEqual(SPEECH_TO_TEXT_MODELS_BY_PROVIDER.mistral);
	expect(getSpeechToTextModelsByProvider('qwen')).toEqual(SPEECH_TO_TEXT_MODELS_BY_PROVIDER.qwen);
	expect(getSpeechToTextModelsByProvider('elevenlabs')).toEqual(
		SPEECH_TO_TEXT_MODELS_BY_PROVIDER.elevenlabs
	);
	expect(getSpeechToTextModelsByProvider('deepgram')).toEqual(SPEECH_TO_TEXT_MODELS_BY_PROVIDER.deepgram);
	expect(getSpeechToTextModelsByProvider('unknown')).toEqual([]);
});

it('returns text-to-speech models by provider', () => {
	expect(getTextToSpeechModelsByProvider('elevenlabs')).toEqual(TEXT_TO_SPEECH_MODELS);
	expect(TEXT_TO_SPEECH_PROVIDER_MODELS).toEqual(TEXT_TO_SPEECH_MODELS_BY_PROVIDER);
	expect(getTextToSpeechModelsByProvider('cartesia')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.cartesia
	);
	expect(getTextToSpeechModelsByProvider('deepgram')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.deepgram
	);
	expect(getTextToSpeechModelsByProvider('google')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.google
	);
	expect(getTextToSpeechModelsByProvider('minimax')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.minimax
	);
	expect(getTextToSpeechModelsByProvider('mistral')).toEqual(TEXT_TO_SPEECH_MODELS_BY_PROVIDER.mistral);
	expect(getTextToSpeechModelsByProvider('openai')).toEqual(TEXT_TO_SPEECH_MODELS_BY_PROVIDER.openai);
	expect(getTextToSpeechModelsByProvider('unknown')).toEqual([]);
});

it('returns provider media catalogs for image/video/music by provider', () => {
	expect(TEXT_TO_IMAGE_PROVIDER_MODELS).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER);
	expect(TEXT_TO_VIDEO_PROVIDER_MODELS).toEqual(TEXT_TO_VIDEO_MODELS_BY_PROVIDER);
	expect(getTextToImageModelsByProvider('openai')).toEqual([]);
	expect(getTextToImageModelsByProvider('black-forest-labs')).toEqual(
		IMAGE_CREATOR_MODELS_BY_PROVIDER['black-forest-labs']
	);
	expect(getTextToImageModelsByProvider('google')).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER.google);
	expect(getTextToImageModelsByProvider('ideogram')).toEqual(
		TEXT_TO_IMAGE_MODELS_BY_PROVIDER.ideogram
	);
	expect(getTextToImageModelsByProvider('xai')).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER.xai);
	expect(getTextToImageModelsByProvider('black-forest-labs')).toEqual(
		IMAGE_CREATOR_MODELS_BY_PROVIDER['black-forest-labs']
	);

		expect(getTextToVideoModelsByProvider('runway')).toEqual(
			TEXT_TO_VIDEO_MODELS_BY_PROVIDER.runway
		);
		expect(getTextToVideoModelsByProvider('pika')).toEqual(TEXT_TO_VIDEO_MODELS_BY_PROVIDER.pika);
		expect(getTextToVideoModelsByProvider('unknown')).toEqual([]);

		expect(getMusicModelsByProvider('google')).toEqual(TEXT_TO_AUDIO_MODELS_BY_PROVIDER.google);
		expect(getMusicModelsByProvider('stability-ai')).toEqual(
			TEXT_TO_AUDIO_MODELS_BY_PROVIDER['stability-ai']
		);
		expect(getMusicModelsByProvider('suno')).toEqual(TEXT_TO_AUDIO_MODELS_BY_PROVIDER.suno);
		expect(getMusicModelsByProvider('unknown')).toEqual([]);
	});

	it('keeps capability lookups provider-keyed', () => {
	expect(getModelsByCapability('speech-to-text', 'xai')).toEqual(
		SPEECH_TO_TEXT_MODELS_BY_PROVIDER.xai
	);
	expect(getModelsByCapability('text-to-speech', 'elevenlabs')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.elevenlabs
	);
		expect(getModelsByCapability('text-to-image', 'ideogram')).toEqual(
			TEXT_TO_IMAGE_MODELS_BY_PROVIDER.ideogram
		);
	expect(getModelsByCapability('text-to-video', 'kling')).toEqual(
		TEXT_TO_VIDEO_MODELS_BY_PROVIDER.kling
	);
	expect(getModelsByCapability('text-to-audio', 'stability-ai')).toEqual(
		TEXT_TO_AUDIO_MODELS_BY_PROVIDER['stability-ai']
	);
	expect(getModelsByCapability('music', 'minimax')).toEqual(
		TEXT_TO_AUDIO_MODELS_BY_PROVIDER.minimax
	);
	expect(getModelsByCapability('embedding', 'openai')).toEqual([]);
});

	it('validates model ids against each capability catalog', () => {
		expect(isAllowedSpeechToTextModel('openai', REALTIME_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(
			true
		);
		expect(isAllowedSpeechToTextModel('openai', MINI_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(true);
		expect(isAllowedSpeechToTextModel('openai', 'speech-to-text-provider-coming-soon')).toBe(
			false
		);
		expect(isAllowedTextToSpeechModel('elevenlabs', 'eleven_v3')).toBe(true);
		expect(isAllowedTextToSpeechModel('cartesia', 'text-to-speech-provider-coming-soon')).toBe(
			false
		);
		expect(isAllowedTextToSpeechModel('cartesia', 'sonic-3.5')).toBe(true);
		expect(isAllowedTextToVideoModel('runway', 'gen4.5')).toBe(true);
		expect(isAllowedTextToVideoModel('runway', 'video-provider-coming-soon')).toBe(false);
		expect(isAllowedMusicCreatorModel('suno', 'suno-v5.5')).toBe(true);
		expect(isAllowedMusicCreatorModel('deepseek', 'music-provider-coming-soon')).toBe(false);
	});

	it('classifies speech-to-text model API types by provider', () => {
		expect(SPEECH_TO_TEXT_MODEL_API_TYPES_BY_PROVIDER).toEqual({
			deepgram: {
				[DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID]: [
					SPEECH_TO_TEXT_BATCH_API_TYPE,
					SPEECH_TO_TEXT_STREAM_API_TYPE,
				],
				[DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
			},
			elevenlabs: {
				[ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
				[ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [
					SPEECH_TO_TEXT_STREAM_API_TYPE,
				],
			},
			mistral: {
				[MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
				[MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
			},
			openai: {
				[GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID]: [
					SPEECH_TO_TEXT_BATCH_API_TYPE,
					SPEECH_TO_TEXT_STREAM_API_TYPE,
				],
				[MINI_SPEECH_TRANSCRIBER_MODEL_ID]: [
					SPEECH_TO_TEXT_BATCH_API_TYPE,
					SPEECH_TO_TEXT_STREAM_API_TYPE,
				],
			},
			qwen: {
				[QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
				[QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
			},
			xai: {
				[XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_BATCH_API_TYPE],
				[XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID]: [SPEECH_TO_TEXT_STREAM_API_TYPE],
			},
		});
		expect(
			getSpeechToTextModelApiTypes('deepgram', DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID)
		).toEqual([SPEECH_TO_TEXT_STREAM_API_TYPE]);
		expect(
			supportsSpeechToTextModelApiType(
				'openai',
				GPT_4O_SPEECH_TRANSCRIBER_MODEL_ID,
				SPEECH_TO_TEXT_BATCH_API_TYPE
			)
		).toBe(true);
		expect(getSpeechToTextModelApiTypes('unknown', 'missing')).toEqual([]);
	});

	it('identifies speech-to-text models that support live dictation', () => {
		expect(isRealtimeSpeechToTextModel('openai', REALTIME_SPEECH_TRANSCRIBER_MODEL_ID)).toBe(
			true
		);
		expect(isRealtimeSpeechToTextModel('elevenlabs', ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID)).toBe(
			true
		);
		expect(isRealtimeSpeechToTextModel('mistral', MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID)).toBe(
			true
		);
		expect(isRealtimeSpeechToTextModel('qwen', QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(isRealtimeSpeechToTextModel('xai', XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID)).toBe(true);
		expect(isRealtimeSpeechToTextModel('elevenlabs', ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID)).toBe(
			false
		);
		expect(isRealtimeSpeechToTextModel('xai', XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID)).toBe(false);
		expect(isRealtimeSpeechToTextModel('deepgram', 'flux')).toBe(false);
	});

	it('exposes the same provider catalogs through the shared models facade', () => {
		expect(getSpeechToTextModels('google')).toEqual([]);
		expect(getTextToSpeechModels('openai')).toEqual(TEXT_TO_SPEECH_MODELS_BY_PROVIDER.openai);
		expect(getTextToImageModels('qwen')).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER.qwen);
		expect(getTextToVideoModels('luma')).toEqual(TEXT_TO_VIDEO_MODELS_BY_PROVIDER.luma);
	expect(getMusicModels('elevenlabs')).toEqual(TEXT_TO_AUDIO_MODELS_BY_PROVIDER.elevenlabs);
	expect(getSharedModelsByCapabilityFromProviders('text-to-speech', 'cartesia')).toEqual(
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER.cartesia
	);
	});

	it('returns model copies from catalog helpers', () => {
		const models = getTextToImageModelsByProvider('black-forest-labs');
		models[0] = { id: 'changed', name: 'Changed' };

		expect(getTextToImageModelsByProvider('black-forest-labs')[0]).toEqual(
			IMAGE_CREATOR_MODELS_BY_PROVIDER['black-forest-labs'][0]
		);
	});
});
