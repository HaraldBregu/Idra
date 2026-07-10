import { DEFAULT_PROVIDERS } from '../../shared';
import {
	MUSIC_PROVIDER_IDS,
	TEXT_TO_AUDIO_MODELS_BY_PROVIDER,
	normalizeProviderId,
} from '../../shared/provider_models_definitions';
import type { SoundRequest, SoundResult } from '../../shared/sound_types';
import { getProvider } from '../providers';
import {
	generateMusic,
	MusicProviderAuthError,
	MusicProviderRequestError,
	MusicProviderUnsupportedError,
} from '../models/tta';
import {
	getModelId as getStoredModelId,
	getProviderId as getStoredProviderId,
} from './sound_store';

const DEFAULT_SOUND_PROVIDER_ID = 'elevenlabs';

export async function createSound(request: SoundRequest): Promise<SoundResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new MusicProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getStoredProviderId() ?? DEFAULT_SOUND_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getStoredModelId());
	const apiKey = resolveApiKey(providerId);
	return generateMusic({ providerId, apiKey, modelId, prompt });
}

function resolveProviderId(providerId: string): string {
	const normalized = normalizeProviderId(providerId);
	if (!(MUSIC_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		throw new MusicProviderUnsupportedError(
			`Text-to-audio provider is not supported: ${normalized}`
		);
	}
	return normalized;
}

function resolveModelId(providerId: string, modelId: string | undefined): string {
	if (modelId?.trim()) return modelId.trim();
	const catalog = TEXT_TO_AUDIO_MODELS_BY_PROVIDER as Readonly<
		Record<string, readonly { readonly id: string }[]>
	>;
	const fallback = catalog[providerId]?.[0]?.id;
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
		const defaults = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
		throw new MusicProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
