import { Service } from 'typedi';
import { normalizeProviderId } from '../../../shared/provider_models_definitions';
import {
	DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
	ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
	MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
	XAI_SPEECH_TO_TEXT_PROVIDER_ID,
} from '../../../shared/provider_models_definitions';
import { createDeepgramSttAdapter } from './providers/deepgram';
import { createElevenLabsSttAdapter } from './providers/elevenlabs';
import { createMistralSttAdapter } from './providers/mistral';
import { createOpenAISttAdapter } from './providers/openai';
import { createQwenSttAdapter } from './providers/qwen';
import { createXaiSttAdapter } from './providers/xai';
import { SttProviderUnsupportedError } from './errors';
import type { SttAdapter, SttProviderSpec } from './types';

@Service()
export class SttAdapterFactory {
	build(provider: SttProviderSpec): SttAdapter {
		const id = normalizeProviderId(provider.id);
		const spec = { ...provider, id };
		if (id === OPENAI_SPEECH_TO_TEXT_PROVIDER_ID) return createOpenAISttAdapter(spec);
		if (id === XAI_SPEECH_TO_TEXT_PROVIDER_ID) return createXaiSttAdapter(spec);
		if (id === MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID) return createMistralSttAdapter(spec);
		if (id === DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID) return createDeepgramSttAdapter(spec);
		if (id === ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID) return createElevenLabsSttAdapter(spec);
		if (id === QWEN_SPEECH_TO_TEXT_PROVIDER_ID) return createQwenSttAdapter(spec);
		throw new SttProviderUnsupportedError(`Speech-to-text provider is not supported: ${id}`);
	}
}
