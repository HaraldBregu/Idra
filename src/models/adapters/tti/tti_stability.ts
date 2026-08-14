import { ImageProviderAuthError, ImageProviderRequestError } from './tti_errors';
import { detectMimeType, requestJson } from './tti_shared';
import type { ImageAdapter, ImageProviderSpec } from './tti_types';

const STABILITY_BASE_URL = 'https://api.stability.ai/v2beta';
const STABILITY_ENDPOINTS: Record<string, string> = {
	'stable-image-ultra': 'ultra',
	'stable-image-core': 'core',
};

type StabilityResponse = { image?: string };

export function createStabilityImageAdapter(spec: ImageProviderSpec): ImageAdapter {
	if (!spec.apiKey) throw new ImageProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? STABILITY_BASE_URL;

	return {
		async generate(request) {
			const endpoint = STABILITY_ENDPOINTS[request.modelId] ?? request.modelId;
			const form = new FormData();
			form.set('prompt', request.prompt);
			for (const [key, value] of Object.entries(request.options ?? {})) {
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
					form.set(key, String(value));
				}
			}
			const response = await requestJson<StabilityResponse>(
				spec.name,
				`${baseURL}/stable-image/generate/${endpoint}`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${spec.apiKey}`, Accept: 'application/json' },
					body: form,
					signal: request.signal,
				}
			);
			if (!response.image) {
				throw new ImageProviderRequestError(`${spec.name}: response contained no image.`);
			}
			return { base64: response.image, mimeType: detectMimeType(response.image) };
		},
	};
}
