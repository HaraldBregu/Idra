import { DEFAULT_PROVIDERS } from '../../shared';
import {
	TEXT_TO_IMAGE_MODELS_BY_PROVIDER,
	TEXT_TO_IMAGE_PROVIDER_IDS,
	normalizeProviderId,
} from '../../shared/provider_models_definitions';
import type { CreatorImageRequest, CreatorImageResult } from '../../shared/creator_types';
import { getProvider } from '../providers';
import {
	generateImage,
	ImageProviderAuthError,
	ImageProviderRequestError,
	ImageProviderUnsupportedError,
} from '../models/tti';
import {
	getModelId as getStoredModelId,
	getProviderId as getStoredProviderId,
} from './creator_store';

const DEFAULT_CREATOR_PROVIDER_ID = 'google';

export async function createImage(request: CreatorImageRequest): Promise<CreatorImageResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new ImageProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getStoredProviderId() ?? DEFAULT_CREATOR_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getStoredModelId());
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
	const catalog = TEXT_TO_IMAGE_MODELS_BY_PROVIDER as Readonly<
		Record<string, readonly { readonly id: string }[]>
	>;
	const fallback = catalog[providerId]?.[0]?.id;
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
		const defaults = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
		throw new ImageProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
