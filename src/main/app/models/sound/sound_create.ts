import { normalizeProviderId } from '../../../../shared/provider_types';
import type { SoundRequest, SoundResult } from '../../../../shared/sound_types';
import { loadProviders, providerModels, supportsCapability } from '../../models';
import { getProvider } from '../../settings_store';
import {
	generateMusic,
	MusicProviderAuthError,
	MusicProviderRequestError,
	MusicProviderUnsupportedError,
} from '../adapters/tta';
import { getModelId, getProviderId } from '../models_store';

const DEFAULT_SOUND_PROVIDER_ID = 'elevenlabs';

export async function createSound(request: SoundRequest): Promise<SoundResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new MusicProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getProviderId('sound') ?? DEFAULT_SOUND_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getModelId('sound'));
	const apiKey = resolveApiKey(providerId);
	return generateMusic({ providerId, apiKey, modelId, prompt });
}

function resolveProviderId(providerId: string): string {
	const normalized = normalizeProviderId(providerId);
	if (!supportsCapability(normalized, 'text-to-audio')) {
		throw new MusicProviderUnsupportedError(
			`Text-to-audio provider is not supported: ${normalized}`
		);
	}
	return normalized;
}

function resolveModelId(providerId: string, modelId: string | undefined): string {
	if (modelId?.trim()) return modelId.trim();
	const fallback = providerModels(providerId, 'text-to-audio')[0]?.id;
	if (!fallback) {
		throw new MusicProviderUnsupportedError(
			`No text-to-audio models available for provider: ${providerId}`
		);
	}
	return fallback;
}

function resolveApiKey(providerId: string): string {
	const stored = getProvider(providerId);
	const apiKey = stored?.apiKey.trim() ?? '';
	if (!apiKey) {
		const defaults = loadProviders().find((provider) => provider.id === providerId);
		throw new MusicProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
