import { ImageProviderAuthError, ImageProviderRequestError } from './tti_errors';
import { fetchImageAsBase64, requestJson } from './tti_shared';
import type { ImageAdapter, ImageProviderSpec } from './tti_types';

const IDEOGRAM_BASE_URL = 'https://api.ideogram.ai';
const IDEOGRAM_LEGACY_MODELS: Record<string, string> = { 'ideogram-2a': 'V_2A' };

type IdeogramResponse = { data?: Array<{ url?: string }> };

export function createIdeogramImageAdapter(spec: ImageProviderSpec): ImageAdapter {
	if (!spec.apiKey) throw new ImageProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? IDEOGRAM_BASE_URL;
	const headers = { 'Api-Key': spec.apiKey, 'Content-Type': 'application/json' };

	return {
		async generate(request) {
			const legacyModel = IDEOGRAM_LEGACY_MODELS[request.modelId];
			const response = legacyModel
				? await requestJson<IdeogramResponse>(spec.name, `${baseURL}/generate`, {
						method: 'POST',
						headers,
						body: JSON.stringify({
							image_request: { prompt: request.prompt, model: legacyModel, ...request.options },
						}),
						signal: request.signal,
					})
				: await requestJson<IdeogramResponse>(spec.name, `${baseURL}/v1/ideogram-v3/generate`, {
						method: 'POST',
						headers,
						body: JSON.stringify({ prompt: request.prompt, ...request.options }),
						signal: request.signal,
					});
			const url = response.data?.[0]?.url;
			if (!url) throw new ImageProviderRequestError(`${spec.name}: response contained no image.`);
			return fetchImageAsBase64(url, request.signal);
		},
	};
}
