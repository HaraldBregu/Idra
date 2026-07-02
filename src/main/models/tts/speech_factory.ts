import { normalizeProviderId } from '../../../shared/provider_models.definitions';
import type { TextToSpeechProviderId } from '../../../shared/provider_models_types';
import { createCartesiaSpeechAdapter } from './speech_cartesia';
import { createDeepgramSpeechAdapter } from './speech_deepgram';
import { createElevenLabsSpeechAdapter } from './speech_elevenlabs';
import { createGoogleSpeechAdapter } from './speech_google';
import { createMiniMaxSpeechAdapter } from './speech_minimax';
import { createMistralSpeechAdapter } from './speech_mistral';
import { createOpenAISpeechAdapter } from './speech_openai';
import { SpeechProviderUnsupportedError } from './speech_errors';
import type { SpeechAdapter, SpeechProviderSpec } from './speech_types';

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
