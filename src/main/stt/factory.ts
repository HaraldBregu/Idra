import { Service } from 'typedi';
import { normalizeProviderId } from '../../shared/providers/models/types';
import { DeepgramSttAdapter } from './providers/deepgram';
import { ElevenLabsSttAdapter } from './providers/elevenlabs';
import { MistralSttAdapter } from './providers/mistral';
import { OpenAISttAdapter } from './providers/openai';
import { QwenSttAdapter } from './providers/qwen';
import { SttProviderUnsupportedError } from './errors';
import type { SttAdapter, SttProviderSpec } from './types';

@Service()
export class SttAdapterFactory {
	build(provider: SttProviderSpec): SttAdapter {
		const id = normalizeProviderId(provider.id);
		if (id === 'openai' || id === 'xai') return new OpenAISttAdapter({ ...provider, id });
		if (id === 'mistral') return new MistralSttAdapter({ ...provider, id });
		if (id === 'deepgram') return new DeepgramSttAdapter({ ...provider, id });
		if (id === 'elevenlabs') return new ElevenLabsSttAdapter({ ...provider, id });
		if (id === 'qwen') return new QwenSttAdapter({ ...provider, id });
		throw new SttProviderUnsupportedError(`Speech-to-text provider is not supported: ${id}`);
	}
}
