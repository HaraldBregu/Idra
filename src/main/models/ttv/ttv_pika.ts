import { VideoProviderAuthError, VideoProviderRequestError } from './ttv_errors';
import { fetchVideoAsBase64, requestJson } from './ttv_shared';
import type { VideoAdapter, VideoProviderSpec } from './ttv_types';

const PIKA_BASE_URL = 'https://fal.run';
const PIKA_ENDPOINTS: Record<string, string> = {
	'pika-2.2': 'fal-ai/pika/v2.2/text-to-video',
};

type PikaResponse = { video?: { url?: string } };

export function createPikaVideoAdapter(spec: VideoProviderSpec): VideoAdapter {
	if (!spec.apiKey) throw new VideoProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? PIKA_BASE_URL;

	return {
		async generate(request) {
			const endpoint = PIKA_ENDPOINTS[request.modelId] ?? PIKA_ENDPOINTS['pika-2.2'];
			const response = await requestJson<PikaResponse>(spec.name, `${baseURL}/${endpoint}`, {
				method: 'POST',
				headers: { Authorization: `Key ${spec.apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: request.prompt }),
				signal: request.signal,
			});
			if (!response.video?.url) {
				throw new VideoProviderRequestError(`${spec.name}: response contained no video.`);
			}
			return fetchVideoAsBase64(response.video.url, request.signal);
		},
	};
}
