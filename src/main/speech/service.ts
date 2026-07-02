import { Service } from 'typedi';
import { DEFAULT_PROVIDERS } from '../../shared/providers';
import {
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_ID,
	TEXT_TO_SPEECH_PROVIDER_IDS,
	type TextToSpeechProviderId,
} from '../../shared/providers/models/tts';
import { normalizeProviderId } from '../../shared/providers/models/types';
import {
	normalizeSpeechSynthesisRequest,
	type SpeechSynthesisRequest,
	type SpeechSynthesisResult,
} from '../../shared/speech/types';
import { getProvider } from '../providers';
import { SpeechAdapterFactory } from './factory';
import { SpeechProviderAuthError, SpeechProviderUnsupportedError } from './errors';
import type { SpeechProviderSpec } from './types';

@Service()
export class SpeechService {
	private readonly adapterFactory = new SpeechAdapterFactory();

	async synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult> {
		const normalized = normalizeSpeechSynthesisRequest(request);
		const providerId = resolveProviderId(normalized.providerId ?? TEXT_TO_SPEECH_PROVIDER_ID);
		const modelId = resolveModelId(providerId, normalized.modelId);
		const provider = resolveProvider(providerId);
		const adapter = this.adapterFactory.build(provider);
		return adapter.synthesize({ ...normalized, providerId, modelId });
	}
}

function resolveProviderId(providerId: string): TextToSpeechProviderId {
	const normalized = normalizeProviderId(providerId);
	if ((TEXT_TO_SPEECH_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		return normalized as TextToSpeechProviderId;
	}
	throw new SpeechProviderUnsupportedError(
		`Text-to-speech provider is not supported: ${normalized}`
	);
}

function resolveModelId(providerId: TextToSpeechProviderId, modelId: string | undefined): string {
	const models = TEXT_TO_SPEECH_MODELS_BY_PROVIDER[providerId];
	if (!modelId) return models[0].id;
	const normalized = modelId.trim();
	if (!models.some((model) => model.id === normalized)) {
		throw new SpeechProviderUnsupportedError(
			`Text-to-speech model is not supported: ${providerId}/${normalized}`
		);
	}
	return normalized;
}

function resolveProvider(providerId: TextToSpeechProviderId): SpeechProviderSpec {
	const stored = getProvider(providerId);
	const defaults = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
	const spec: SpeechProviderSpec = {
		id: providerId,
		name: stored?.name || defaults?.name || providerId,
		apiKey: stored?.apiKey.trim() ?? '',
		baseURL: stored?.baseUrl || defaults?.baseUrl || '',
	};
	if (!spec.apiKey) {
		throw new SpeechProviderAuthError(`${spec.name} API key not configured.`);
	}
	return spec;
}
