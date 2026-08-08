import {
	SttProviderAuthError,
	SttProviderRequestError,
	SttProviderUnsupportedError,
} from '../../../../src/main/models/adapters/stt/stt_errors';
import {
	SpeechProviderAuthError,
	SpeechProviderRequestError,
	SpeechProviderUnsupportedError,
} from '../../../../src/main/models/adapters/tts/tts_errors';
import {
	ImageProviderAuthError,
	ImageProviderRequestError,
	ImageProviderUnsupportedError,
} from '../../../../src/main/models/adapters/tti/tti_errors';

const cases: Array<[new (m: string) => Error, string]> = [
	[SttProviderAuthError, 'SttProviderAuthError'],
	[SttProviderRequestError, 'SttProviderRequestError'],
	[SttProviderUnsupportedError, 'SttProviderUnsupportedError'],
	[SpeechProviderAuthError, 'SpeechProviderAuthError'],
	[SpeechProviderRequestError, 'SpeechProviderRequestError'],
	[SpeechProviderUnsupportedError, 'SpeechProviderUnsupportedError'],
	[ImageProviderAuthError, 'ImageProviderAuthError'],
	[ImageProviderRequestError, 'ImageProviderRequestError'],
	[ImageProviderUnsupportedError, 'ImageProviderUnsupportedError'],
];

describe('provider error classes', () => {
	it.each(cases)('%p is an Error with the right name and message', (Ctor, name) => {
		const err = new Ctor('boom');
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe(name);
		expect(err.message).toBe('boom');
	});
});
