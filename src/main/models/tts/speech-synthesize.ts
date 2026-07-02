import { DEFAULT_PROVIDERS } from '../../../shared';
import {
	TEXT_TO_SPEECH_MODELS_BY_PROVIDER,
	TEXT_TO_SPEECH_PROVIDER_ID,
	TEXT_TO_SPEECH_PROVIDER_IDS,
} from '../../../shared/provider_models_tts.definitions';
import type { TextToSpeechProviderId } from '../../../shared/provider_models_tts.types';
import { normalizeProviderId } from '../../../shared/providers_models.definitions';
import {
	normalizeSpeechSynthesisRequest,
	type SpeechSynthesisRequest,
	type SpeechSynthesisResult,
} from '../../../shared/speech.types';
import { getProvider } from '../../providers';
import { buildSpeechAdapter } from './speech-factory';
import { SpeechProviderAuthError, SpeechProviderUnsupportedError } from './speech-errors';
import {
	getModelId as getStoredModelId,
	getProviderId as getStoredProviderId,
} from '../../speech/speech-store';
import type { SpeechProviderSpec } from './speech-types';

export async function synthesize(request: SpeechSynthesisRequest): Promise<SpeechSynthesisResult> {
	const normalized = normalizeSpeechSynthesisRequest(request);
	const providerId = resolveProviderId(
		normalized.providerId ?? configuredProviderId() ?? TEXT_TO_SPEECH_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, normalized.modelId ?? configuredModelId(providerId));
	const provider = resolveProvider(providerId);
	return buildSpeechAdapter(provider).synthesize({ ...normalized, providerId, modelId });
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

function configuredProviderId(): TextToSpeechProviderId | undefined {
	const stored = getStoredProviderId();
	if (!stored) return undefined;
	const normalized = normalizeProviderId(stored);
	return (TEXT_TO_SPEECH_PROVIDER_IDS as readonly string[]).includes(normalized)
		? (normalized as TextToSpeechProviderId)
		: undefined;
}

function configuredModelId(providerId: TextToSpeechProviderId): string | undefined {
	if (configuredProviderId() !== providerId) return undefined;
	const modelId = getStoredModelId();
	return modelId &&
		TEXT_TO_SPEECH_MODELS_BY_PROVIDER[providerId].some((model) => model.id === modelId)
		? modelId
		: undefined;
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
