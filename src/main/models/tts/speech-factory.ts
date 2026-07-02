import { normalizeProviderId } from '../../../shared/provider_models.definitions';
import type { TextToSpeechProviderId } from '../../../shared/provider_models.types';
import { createCartesiaSpeechAdapter } from './speech-cartesia';
import { createDeepgramSpeechAdapter } from './speech-deepgram';
import { createElevenLabsSpeechAdapter } from './speech-elevenlabs';
import { createGoogleSpeechAdapter } from './speech-google';
import { createMiniMaxSpeechAdapter } from './speech-minimax';
import { createMistralSpeechAdapter } from './speech-mistral';
import { createOpenAISpeechAdapter } from './speech-openai';
import { SpeechProviderUnsupportedError } from './speech-errors';
import type { SpeechAdapter, SpeechProviderSpec } from './speech-types';

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

export function buildSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	const id = normalizeProviderId(provider.id);
	const create = SPEECH_ADAPTERS[id as TextToSpeechProviderId];
	if (!create) {
		throw new SpeechProviderUnsupportedError(`Text-to-speech provider is not supported: ${id}`);
	}
	return create({ ...provider, id });
}
