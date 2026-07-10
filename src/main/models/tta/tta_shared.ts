import { MusicProviderAuthError, MusicProviderRequestError } from './tta_errors';
import type { MusicGenerationResult } from './tta_types';

export async function requestAudio(
	providerName: string,
	url: string,
	init: RequestInit
): Promise<MusicGenerationResult> {
	const response = await fetch(url, init);
	if (response.status === 401 || response.status === 403) {
		throw new MusicProviderAuthError(`${providerName}: authentication failed.`);
	}
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new MusicProviderRequestError(
			`${providerName} request failed (${response.status}): ${detail}`
		);
	}
	const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
	return { base64, mimeType: response.headers.get('content-type') ?? 'audio/mpeg' };
}
