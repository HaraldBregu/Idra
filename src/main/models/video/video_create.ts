import {
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_PROVIDER_IDS,
	normalizeProviderId,
} from '../../../shared/provider_models_definitions';
import type { VideoRequest, VideoResult } from '../../../shared/video_types';
import { getProvider, loadProviderCatalog } from '../../providers';
import {
	generateVideo,
	VideoProviderAuthError,
	VideoProviderRequestError,
	VideoProviderUnsupportedError,
} from '../../app/models_adapters/ttv';
import { getModelId, getProviderId } from '../models_store';

const DEFAULT_VIDEO_PROVIDER_ID = 'google';

export async function createVideo(request: VideoRequest): Promise<VideoResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new VideoProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getProviderId('video') ?? DEFAULT_VIDEO_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getModelId('video'));
	const apiKey = resolveApiKey(providerId);
	return generateVideo({ providerId, apiKey, modelId, prompt });
}

function resolveProviderId(providerId: string): string {
	const normalized = normalizeProviderId(providerId);
	if (!(TEXT_TO_VIDEO_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		throw new VideoProviderUnsupportedError(
			`Text-to-video provider is not supported: ${normalized}`
		);
	}
	return normalized;
}

function resolveModelId(providerId: string, modelId: string | undefined): string {
	if (modelId?.trim()) return modelId.trim();
	const catalog = TEXT_TO_VIDEO_MODELS_BY_PROVIDER as Readonly<
		Record<string, readonly { readonly id: string }[]>
	>;
	const fallback = catalog[providerId]?.[0]?.id;
	if (!fallback) {
		throw new VideoProviderUnsupportedError(
			`No text-to-video models available for provider: ${providerId}`
		);
	}
	return fallback;
}

function resolveApiKey(providerId: string): string {
	const stored = getProvider(providerId);
	const apiKey = stored?.apiKey.trim() ?? '';
	if (!apiKey) {
		const defaults = loadProviderCatalog().find((provider) => provider.id === providerId);
		throw new VideoProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
