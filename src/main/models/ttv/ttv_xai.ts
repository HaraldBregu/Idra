import { VideoProviderAuthError, VideoProviderRequestError } from './ttv_errors';
import { fetchVideoAsBase64, requestJson } from './ttv_shared';
import type { VideoAdapter, VideoProviderSpec } from './ttv_types';

const XAI_BASE_URL = 'https://api.x.ai/v1';

type XaiVideoResponse = {
	data?: Array<{ url?: string; b64_json?: string }>;
};

export function createXaiVideoAdapter(spec: VideoProviderSpec): VideoAdapter {
	if (!spec.apiKey) throw new VideoProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? XAI_BASE_URL;

	return {
		async generate(request) {
			const response = await requestJson<XaiVideoResponse>(
				spec.name,
				`${baseURL}/videos/generations`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${spec.apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ model: request.modelId, prompt: request.prompt }),
					signal: request.signal,
				}
			);
			const video = response.data?.[0];
			if (video?.b64_json) return { base64: video.b64_json, mimeType: 'video/mp4' };
			if (video?.url) return fetchVideoAsBase64(video.url, request.signal);
			throw new VideoProviderRequestError(`${spec.name}: response contained no video.`);
		},
	};
}
