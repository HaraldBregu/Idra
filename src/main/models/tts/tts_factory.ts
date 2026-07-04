import { normalizeProviderId } from '../../../shared/provider_models_definitions';
import type { TextToSpeechProviderId } from '../../../shared/provider_models_types';
import { createCartesiaSpeechAdapter } from './tts_cartesia';
import { createDeepgramSpeechAdapter } from './tts_deepgram';
import { createElevenLabsSpeechAdapter } from './tts_elevenlabs';
import { createGoogleSpeechAdapter } from './tts_google';
import { createMiniMaxSpeechAdapter } from './tts_minimax';
import { createMistralSpeechAdapter } from './tts_mistral';
import { createOpenAISpeechAdapter } from './tts_openai';
import { SpeechProviderUnsupportedError } from './tts_errors';
import type { SpeechAdapter, SpeechProviderSpec } from './tts_types';

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
