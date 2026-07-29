import { TEXT_TO_SPEECH_PROVIDER_ID, TEXT_TO_SPEECH_PROVIDER_IDS } from '../../../../shared/provider_types';
import type { TextToSpeechProviderId } from '../../../../shared/provider_types';
import { normalizeProviderId } from '../../../../shared/provider_types';
import {
	normalizeSpeechSynthesisRequest,
	type SpeechSynthesisRequest,
	type SpeechSynthesisResult,
} from '../../../../shared/speech_types';
import { getProvider, loadProviders, providerModels } from '../../../providers';
import { buildSpeechAdapter } from './tts_factory';
import { SpeechProviderAuthError, SpeechProviderUnsupportedError } from './tts_errors';
import { getModelId, getProviderId } from '../../../models/models_store';
import type { SpeechProviderSpec } from './tts_types';

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
	const models = providerModels(providerId, 'text-to-speech');
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
	const stored = getProviderId('voice');
	if (!stored) return undefined;
	const normalized = normalizeProviderId(stored);
	return (TEXT_TO_SPEECH_PROVIDER_IDS as readonly string[]).includes(normalized)
		? (normalized as TextToSpeechProviderId)
		: undefined;
}

function configuredModelId(providerId: TextToSpeechProviderId): string | undefined {
	if (configuredProviderId() !== providerId) return undefined;
	const modelId = getModelId('voice');
	return modelId &&
		providerModels(providerId, 'text-to-speech').some((model) => model.id === modelId)
		? modelId
		: undefined;
}

function resolveProvider(providerId: TextToSpeechProviderId): SpeechProviderSpec {
	const stored = getProvider(providerId);
	const defaults = loadProviders().find((provider) => provider.id === providerId);
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
