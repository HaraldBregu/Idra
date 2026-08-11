import { VideoProviderAuthError, VideoProviderRequestError } from './ttv_errors';
import { fetchVideoAsBase64, poll, requestJson } from './ttv_shared';
import type { VideoAdapter, VideoProviderSpec } from './ttv_types';

const RUNWAY_BASE_URL = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06';
const RUNWAY_DEFAULT_DURATIONS: Readonly<Record<string, number>> = {
	hailuo3: 6,
	'veo3.1': 8,
	'veo3.1_fast': 8,
};

type RunwayTask = {
	id?: string;
	status?: string;
	failure?: string;
	output?: string[];
};

export function createRunwayVideoAdapter(spec: VideoProviderSpec): VideoAdapter {
	if (!spec.apiKey) throw new VideoProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? RUNWAY_BASE_URL;
	const headers = {
		Authorization: `Bearer ${spec.apiKey}`,
		'Content-Type': 'application/json',
		'X-Runway-Version': RUNWAY_VERSION,
	};

	return {
		async generate(request) {
			const task = await requestJson<RunwayTask>(spec.name, `${baseURL}/text_to_video`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					model: request.modelId,
					promptText: request.prompt,
					ratio: '1280:720',
					duration: RUNWAY_DEFAULT_DURATIONS[request.modelId] ?? 5,
					...request.options,
				}),
				signal: request.signal,
			});
			if (!task.id) {
				throw new VideoProviderRequestError(`${spec.name}: generation was not accepted.`);
			}

			const videoUrl = await poll(spec.name, 120, 5000, async () => {
				const status = await requestJson<RunwayTask>(spec.name, `${baseURL}/tasks/${task.id}`, {
					headers,
					signal: request.signal,
				});
				if (status.status === 'SUCCEEDED') {
					if (!status.output?.[0]) {
						throw new VideoProviderRequestError(`${spec.name}: result contained no video.`);
					}
					return status.output[0];
				}
				if (status.status === 'FAILED') {
					throw new VideoProviderRequestError(
						`${spec.name}: generation failed. ${status.failure ?? ''}`.trim()
					);
				}
				return undefined;
			});
			return fetchVideoAsBase64(videoUrl, request.signal);
		},
	};
}
