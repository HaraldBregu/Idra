jest.mock('@mistralai/mistralai', () => ({
	Mistral: jest.fn(() => ({ audio: { transcriptions: { complete: jest.fn() } } })),
}));

import { SttAdapterFactory } from '../../../../src/main/stt/factory';
import { DeepgramSttAdapter } from '../../../../src/main/stt/providers/deepgram';
import { ElevenLabsSttAdapter } from '../../../../src/main/stt/providers/elevenlabs';
import { MistralSttAdapter } from '../../../../src/main/stt/providers/mistral';
import { OpenAISttAdapter } from '../../../../src/main/stt/providers/openai';
import { SttProviderUnsupportedError } from '../../../../src/main/stt/errors';

describe('SttAdapterFactory', () => {
	const provider = { id: 'openai', name: 'OpenAI', apiKey: 'test-key' };

	it('routes speech-to-text providers to their adapters', () => {
		const factory = new SttAdapterFactory();

		expect(factory.build(provider)).toBeInstanceOf(OpenAISttAdapter);
		expect(factory.build({ ...provider, id: 'xai', name: 'xAI' })).toBeInstanceOf(
			OpenAISttAdapter
		);
		expect(factory.build({ ...provider, id: 'mistral', name: 'Mistral' })).toBeInstanceOf(
			MistralSttAdapter
		);
		expect(factory.build({ ...provider, id: 'deepgram', name: 'Deepgram' })).toBeInstanceOf(
			DeepgramSttAdapter
		);
		expect(
			factory.build({ ...provider, id: 'elevenlabs', name: 'ElevenLabs' })
		).toBeInstanceOf(ElevenLabsSttAdapter);
	});

	it('rejects unsupported providers', () => {
		const factory = new SttAdapterFactory();

		expect(() => factory.build({ ...provider, id: 'qwen', name: 'Qwen' })).toThrow(
			SttProviderUnsupportedError
		);
	});
});
