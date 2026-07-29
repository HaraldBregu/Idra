import { TEXT_TO_IMAGE_PROVIDER_IDS, normalizeProviderId } from '../../../shared/provider_types';
import type { ImageRequest, ImageResult } from '../../../shared/image_types';
import { getProvider, loadProviders, providerModels } from '../../providers';
import {
	generateImage,
	ImageProviderAuthError,
	ImageProviderRequestError,
	ImageProviderUnsupportedError,
} from '../../app/models_adapters/tti';
import { getModelId, getProviderId } from '../models_store';

const DEFAULT_IMAGE_PROVIDER_ID = 'google';

export async function createImage(request: ImageRequest): Promise<ImageResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new ImageProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getProviderId('image') ?? DEFAULT_IMAGE_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getModelId('image'));
	const apiKey = resolveApiKey(providerId);
	return generateImage({ providerId, apiKey, modelId, prompt });
}

function resolveProviderId(providerId: string): string {
	const normalized = normalizeProviderId(providerId);
	if (!(TEXT_TO_IMAGE_PROVIDER_IDS as readonly string[]).includes(normalized)) {
		throw new ImageProviderUnsupportedError(
			`Text-to-image provider is not supported: ${normalized}`
		);
	}
	return normalized;
}

function resolveModelId(providerId: string, modelId: string | undefined): string {
	if (modelId?.trim()) return modelId.trim();
	const fallback = providerModels(providerId, 'text-to-image')[0]?.id;
	if (!fallback) {
		throw new ImageProviderUnsupportedError(
			`No text-to-image models available for provider: ${providerId}`
		);
	}
	return fallback;
}

function resolveApiKey(providerId: string): string {
	const stored = getProvider(providerId);
	const apiKey = stored?.apiKey.trim() ?? '';
	if (!apiKey) {
		const defaults = loadProviders().find((provider) => provider.id === providerId);
		throw new ImageProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
