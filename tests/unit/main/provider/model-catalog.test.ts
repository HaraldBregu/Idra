import {
	IMAGE_CREATOR_MODELS,
	IMAGE_CREATOR_MODELS_BY_PROVIDER,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	MUSIC_CREATOR_MODELS,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_PROVIDER_MODELS,
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_MODELS,
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_MODELS,
	getModelsByCapability,
	getMusicModelsByProvider,
	getSpeechToTextModelsByProvider,
	getTextToImageModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../../../../src/shared/provider-models';
import {
	getModelsByCapability as getSharedModelsByCapability,
	getMusicModels,
	getSpeechToTextModels,
	getTextToImageModels,
	getTextToSpeechModels,
	getTextToVideoModels,
} from '../../../../src/shared/models';
import {
	isAllowedMusicCreatorModel,
	isAllowedSpeechToTextModel,
	isAllowedTextToSpeechModel,
	isAllowedTextToVideoModel,
} from '../../../../src/shared/service';

describe('provider model catalogs', () => {
	it('returns speech-to-text models by provider', () => {
		expect(getSpeechToTextModelsByProvider('openai')).toEqual(SPEECH_TO_TEXT_MODELS);
		expect(getSpeechToTextModelsByProvider('google')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('xai')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('mistral')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('qwen')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('elevenlabs')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('deepgram')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('unknown')).toEqual([]);
	});

	it('returns text-to-speech models by provider', () => {
		expect(getTextToSpeechModelsByProvider('elevenlabs')).toEqual(TEXT_TO_SPEECH_MODELS);
		expect(getTextToSpeechModelsByProvider('cartesia')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('deepgram')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('google')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('minimax')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('mistral')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('openai')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('unknown')).toEqual([]);
	});

	it('returns provider media catalogs for image/video/music by provider', () => {
		expect(getTextToImageModelsByProvider('openai')).toEqual([]);
		expect(getTextToImageModelsByProvider('black-forest-labs')).toEqual(
			IMAGE_CREATOR_MODELS_BY_PROVIDER['black-forest-labs']
		);
		expect(getTextToImageModelsByProvider('google')).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER.google);
		expect(getTextToImageModelsByProvider('ideogram')).toEqual(
			TEXT_TO_IMAGE_MODELS_BY_PROVIDER.ideogram
		);
		expect(getTextToImageModelsByProvider('xai')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getTextToImageModelsByProvider('black-forest-labs')).toEqual(IMAGE_CREATOR_MODELS);

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
			SPEECH_TO_TEXT_PROVIDER_MODELS
		);
		expect(getModelsByCapability('text-to-speech', 'elevenlabs')).toEqual(
			TEXT_TO_SPEECH_MODELS
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

	it('exposes the same provider catalogs through the shared models facade', () => {
		expect(getSpeechToTextModels('google')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getTextToSpeechModels('openai')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToImageModels('qwen')).toEqual(TEXT_TO_IMAGE_MODELS_BY_PROVIDER.qwen);
		expect(getTextToVideoModels('luma')).toEqual(TEXT_TO_VIDEO_MODELS_BY_PROVIDER.luma);
		expect(getMusicModels('elevenlabs')).toEqual(TEXT_TO_AUDIO_MODELS_BY_PROVIDER.elevenlabs);
		expect(getSharedModelsByCapability('text-to-speech', 'cartesia')).toEqual(
			TEXT_TO_SPEECH_PROVIDER_MODELS.cartesia
		);
	});

	it('returns model copies from catalog helpers', () => {
		const models = getTextToImageModelsByProvider('xai');
		const firstModel = models[0];
		models[0] = { ...firstModel, id: 'changed', name: 'Changed' };

		expect(getTextToImageModelsByProvider('xai')[0]).toEqual(IMAGE_CREATOR_MODELS[0]);
	});
});
