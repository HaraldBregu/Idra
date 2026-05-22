import {
	IMAGE_CREATOR_MODELS,
	MINI_SPEECH_TRANSCRIBER_MODEL_ID,
	MUSIC_CREATOR_MODELS,
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	SPEECH_TO_TEXT_MODELS,
	SPEECH_TO_TEXT_PROVIDER_MODELS,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_MODELS,
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
		expect(getSpeechToTextModelsByProvider('elevenlabs')).toEqual(
			SPEECH_TO_TEXT_PROVIDER_MODELS
		);
		expect(getSpeechToTextModelsByProvider('deepgram')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getSpeechToTextModelsByProvider('unknown')).toEqual([]);
	});

	it('returns text-to-speech models by provider', () => {
		expect(getTextToSpeechModelsByProvider('elevenlabs')).toEqual(TEXT_TO_SPEECH_MODELS);
		expect(getTextToSpeechModelsByProvider('openai')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('google')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('mistral')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('minimax')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('deepgram')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('cartesia')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToSpeechModelsByProvider('unknown')).toEqual([]);
	});

	it('returns provider-backed placeholder catalogs for pending media modules', () => {
		expect(getTextToImageModelsByProvider('openai')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getTextToImageModelsByProvider('black-forest-labs')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getTextToImageModelsByProvider('unknown')).toEqual([]);

		expect(getTextToVideoModelsByProvider('runway')).toEqual(TEXT_TO_VIDEO_MODELS);
		expect(getTextToVideoModelsByProvider('pika')).toEqual(TEXT_TO_VIDEO_MODELS);
		expect(getTextToVideoModelsByProvider('unknown')).toEqual([]);

		expect(getMusicModelsByProvider('google')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getMusicModelsByProvider('stability-ai')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getMusicModelsByProvider('suno')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getMusicModelsByProvider('unknown')).toEqual([]);
	});

	it('keeps capability lookups provider-keyed', () => {
		expect(getModelsByCapability('speech-to-text', 'xai')).toEqual(
			SPEECH_TO_TEXT_PROVIDER_MODELS
		);
		expect(getModelsByCapability('text-to-speech', 'elevenlabs')).toEqual(
			TEXT_TO_SPEECH_MODELS
		);
		expect(getModelsByCapability('text-to-image', 'ideogram')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getModelsByCapability('text-to-video', 'kling')).toEqual(TEXT_TO_VIDEO_MODELS);
		expect(getModelsByCapability('text-to-audio', 'stability-ai')).toEqual(
			MUSIC_CREATOR_MODELS
		);
		expect(getModelsByCapability('music', 'minimax')).toEqual(MUSIC_CREATOR_MODELS);
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
		expect(isAllowedTextToSpeechModel('elevenlabs', 'rachel-multilingual')).toBe(true);
		expect(isAllowedTextToSpeechModel('cartesia', 'text-to-speech-provider-coming-soon')).toBe(
			true
		);
		expect(isAllowedTextToVideoModel('runway', 'video-provider-coming-soon')).toBe(true);
		expect(isAllowedMusicCreatorModel('suno', 'music-provider-coming-soon')).toBe(true);
		expect(isAllowedMusicCreatorModel('deepseek', 'music-provider-coming-soon')).toBe(false);
	});

	it('exposes the same provider catalogs through the shared models facade', () => {
		expect(getSpeechToTextModels('google')).toEqual(SPEECH_TO_TEXT_PROVIDER_MODELS);
		expect(getTextToSpeechModels('openai')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
		expect(getTextToImageModels('qwen')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getTextToVideoModels('luma')).toEqual(TEXT_TO_VIDEO_MODELS);
		expect(getMusicModels('elevenlabs')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getSharedModelsByCapability('text-to-speech', 'cartesia')).toEqual(
			TEXT_TO_SPEECH_PROVIDER_MODELS
		);
	});

	it('returns model copies from catalog helpers', () => {
		const models = getTextToImageModelsByProvider('openai');
		models[0] = { id: 'changed', name: 'Changed' };

		expect(getTextToImageModelsByProvider('openai')).toEqual(IMAGE_CREATOR_MODELS);
	});
});
