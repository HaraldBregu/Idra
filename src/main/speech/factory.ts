import { Service } from 'typedi';
import { normalizeProviderId } from '../../shared/providers/models/types';
import type { TextToSpeechProviderId } from '../../shared/providers/models/tts';
import { createCartesiaSpeechAdapter } from './providers/cartesia';
import { createDeepgramSpeechAdapter } from './providers/deepgram';
import { createElevenLabsSpeechAdapter } from './providers/elevenlabs';
import { createGoogleSpeechAdapter } from './providers/google';
import { createMiniMaxSpeechAdapter } from './providers/minimax';
import { createMistralSpeechAdapter } from './providers/mistral';
import { createOpenAISpeechAdapter } from './providers/openai';
import { SpeechProviderUnsupportedError } from './errors';
import type { SpeechAdapter, SpeechProviderSpec } from './types';

const SPEECH_ADAPTERS: Readonly<
	Record<TextToSpeechProviderId, (spec: SpeechProviderSpec) => SpeechAdapter>
> = {
	cartesia: createCartesiaSpeechAdapter,
	deepgram: createDeepgramSpeechAdapter,
	elevenlabs: createElevenLabsSpeechAdapter,
	google: createGoogleSpeechAdapter,
	minimax: createMiniMaxSpeechAdapter,
	mistral: createMistralSpeechAdapter,
	openai: createOpenAISpeechAdapter,
};

@Service()
export class SpeechAdapterFactory {
	build(provider: SpeechProviderSpec): SpeechAdapter {
		const id = normalizeProviderId(provider.id);
		const create = SPEECH_ADAPTERS[id as TextToSpeechProviderId];
		if (!create) {
			throw new SpeechProviderUnsupportedError(`Text-to-speech provider is not supported: ${id}`);
		}
		return create({ ...provider, id });
	}
}
