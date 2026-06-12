import { Service } from 'typedi';
import { normalizeProviderId } from '../../shared/providers/models/types';
import {
	DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
	ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID,
	MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
	XAI_SPEECH_TO_TEXT_PROVIDER_ID,
} from '../../shared/providers/models/stt';
import { DeepgramSttAdapter } from './providers/deepgram';
import { ElevenLabsSttAdapter } from './providers/elevenlabs';
import { MistralSttAdapter } from './providers/mistral';
import { OpenAISttAdapter } from './providers/openai';
import { QwenSttAdapter } from './providers/qwen';
import { XaiSttAdapter } from './providers/xai';
import { SttProviderUnsupportedError } from './errors';
import type { SttAdapter, SttProviderSpec } from './types';

@Service()
export class SttAdapterFactory {
	build(provider: SttProviderSpec): SttAdapter {
		const id = normalizeProviderId(provider.id);
		if (id === OPENAI_SPEECH_TO_TEXT_PROVIDER_ID) return new OpenAISttAdapter({ ...provider, id });
		if (id === XAI_SPEECH_TO_TEXT_PROVIDER_ID) return new XaiSttAdapter({ ...provider, id });
		if (id === MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID)
			return new MistralSttAdapter({ ...provider, id });
		if (id === DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID)
			return new DeepgramSttAdapter({ ...provider, id });
		if (id === ELEVENLABS_SPEECH_TO_TEXT_PROVIDER_ID) {
			return new ElevenLabsSttAdapter({ ...provider, id });
		}
		if (id === QWEN_SPEECH_TO_TEXT_PROVIDER_ID) return new QwenSttAdapter({ ...provider, id });
		throw new SttProviderUnsupportedError(`Speech-to-text provider is not supported: ${id}`);
	}
}
