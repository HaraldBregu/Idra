import {
	IMAGE_CREATOR_MODELS,
	MUSIC_CREATOR_MODELS,
	TEXT_TO_SPEECH_MODELS,
	TEXT_TO_SPEECH_PROVIDER_MODELS,
	TEXT_TO_VIDEO_MODELS,
	getModelsByCapability,
	getMusicModelsByProvider,
	getTextToImageModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../../../../src/shared/provider-models';
import {
	getModelsByCapability as getSharedModelsByCapability,
	getMusicModels,
	getTextToImageModels,
	getTextToSpeechModels,
	getTextToVideoModels,
} from '../../../../src/shared/models';

describe('provider model catalogs', () => {
	it('returns text-to-speech models by provider', () => {
		expect(getTextToSpeechModelsByProvider('elevenlabs')).toEqual(TEXT_TO_SPEECH_MODELS);
		expect(getTextToSpeechModelsByProvider('openai')).toEqual(TEXT_TO_SPEECH_PROVIDER_MODELS);
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
		expect(getMusicModelsByProvider('suno')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getMusicModelsByProvider('unknown')).toEqual([]);
	});

	it('keeps capability lookups provider-keyed', () => {
		expect(getModelsByCapability('text-to-speech', 'elevenlabs')).toEqual(
			TEXT_TO_SPEECH_MODELS
		);
		expect(getModelsByCapability('text-to-image', 'ideogram')).toEqual(IMAGE_CREATOR_MODELS);
		expect(getModelsByCapability('text-to-video', 'kling')).toEqual(TEXT_TO_VIDEO_MODELS);
		expect(getModelsByCapability('music', 'minimax')).toEqual(MUSIC_CREATOR_MODELS);
		expect(getModelsByCapability('embedding', 'openai')).toEqual([]);
	});

	it('exposes the same provider catalogs through the shared models facade', () => {
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
