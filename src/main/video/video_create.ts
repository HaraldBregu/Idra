import { DEFAULT_PROVIDERS } from '../../shared';
import {
	TEXT_TO_VIDEO_MODELS_BY_PROVIDER,
	TEXT_TO_VIDEO_PROVIDER_IDS,
	normalizeProviderId,
} from '../../shared/provider_models_definitions';
import type { VideoRequest, VideoResult } from '../../shared/video_types';
import { getProvider } from '../providers';
import {
	generateVideo,
	VideoProviderAuthError,
	VideoProviderRequestError,
	VideoProviderUnsupportedError,
} from '../models/ttv';
import {
	getModelId as getStoredModelId,
	getProviderId as getStoredProviderId,
} from './video_store';

const DEFAULT_VIDEO_PROVIDER_ID = 'google';

export async function createVideo(request: VideoRequest): Promise<VideoResult> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new VideoProviderRequestError('Prompt is required.');

	const providerId = resolveProviderId(
		request.providerId ?? getStoredProviderId() ?? DEFAULT_VIDEO_PROVIDER_ID
	);
	const modelId = resolveModelId(providerId, request.modelId ?? getStoredModelId());
	const apiKey = resolveApiKey(providerId);
	const result = await generateVideo({ providerId, apiKey, modelId, prompt });
	await saveVideoFile(result);
	return result;
}

async function saveVideoFile(result: VideoResult): Promise<void> {
	const ext = result.mimeType.split('/')[1]?.split('+')[0] || 'mp4';
	const videoDir = path.resolve(userDataLocation(), 'video');
	await fs.mkdir(videoDir, { recursive: true });
	await fs.writeFile(
		path.join(videoDir, `video-${Date.now()}.${ext}`),
		Buffer.from(result.base64, 'base64')
	);
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
		const defaults = DEFAULT_PROVIDERS.find((provider) => provider.id === providerId);
		throw new VideoProviderAuthError(
			`${stored?.name || defaults?.name || providerId} API key not configured.`
		);
	}
	return apiKey;
}
