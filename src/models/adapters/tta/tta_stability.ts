import { MusicProviderAuthError } from './tta_errors';
import { requestAudio } from './tta_shared';
import type { MusicAdapter, MusicProviderSpec } from './tta_types';

const STABILITY_BASE_URL = 'https://api.stability.ai/v2beta';

export function createStabilityMusicAdapter(spec: MusicProviderSpec): MusicAdapter {
	if (!spec.apiKey) throw new MusicProviderAuthError(`${spec.name} API key not configured.`);
	const baseURL = spec.baseURL ?? STABILITY_BASE_URL;

	return {
		generate(request) {
			const form = new FormData();
			form.set('prompt', request.prompt);
			form.set('output_format', 'mp3');
			for (const [key, value] of Object.entries(request.options ?? {})) {
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
					form.set(key, String(value));
				}
			}
			return requestAudio(spec.name, `${baseURL}/audio/stable-audio-2/text-to-audio`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${spec.apiKey}`, Accept: 'audio/*' },
				body: form,
				signal: request.signal,
			});
		},
	};
}
