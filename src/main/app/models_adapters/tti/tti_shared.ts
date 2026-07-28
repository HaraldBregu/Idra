import { ImageProviderAuthError, ImageProviderRequestError } from './tti_errors';
import type { ImageGenerationResult } from './tti_types';

export async function requestJson<T>(
	providerName: string,
	url: string,
	init: RequestInit
): Promise<T> {
	const response = await fetch(url, init);
	if (response.status === 401 || response.status === 403) {
		throw new ImageProviderAuthError(`${providerName}: authentication failed.`);
	}
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new ImageProviderRequestError(
			`${providerName} request failed (${response.status}): ${detail}`
		);
	}
	return (await response.json()) as T;
}

export async function fetchImageAsBase64(
	url: string,
	signal?: AbortSignal
): Promise<ImageGenerationResult> {
	const response = await fetch(url, { signal });
	if (!response.ok) {
		throw new ImageProviderRequestError(`Failed to download generated image (${response.status}).`);
	}
	const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
	return { base64, mimeType: response.headers.get('content-type') ?? detectMimeType(base64) };
}

export function detectMimeType(base64: string): string {
	if (base64.startsWith('/9j/')) return 'image/jpeg';
	if (base64.startsWith('iVBOR')) return 'image/png';
	if (base64.startsWith('UklGR')) return 'image/webp';
	if (base64.startsWith('R0lGOD')) return 'image/gif';
	return 'image/png';
}

export async function poll<T>(
	providerName: string,
	attempts: number,
	intervalMs: number,
	check: () => Promise<T | undefined>
): Promise<T> {
	for (let i = 0; i < attempts; i++) {
		const result = await check();
		if (result !== undefined) return result;
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
	throw new ImageProviderRequestError(`${providerName}: image generation timed out.`);
}
