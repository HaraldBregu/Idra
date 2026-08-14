import { VideoProviderAuthError, VideoProviderRequestError } from './ttv_errors';
import type { VideoGenerationResult } from './ttv_types';

export async function requestJson<T>(
	providerName: string,
	url: string,
	init: RequestInit
): Promise<T> {
	const response = await fetch(url, init);
	if (response.status === 401 || response.status === 403) {
		throw new VideoProviderAuthError(`${providerName}: authentication failed.`);
	}
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new VideoProviderRequestError(
			`${providerName} request failed (${response.status}): ${detail}`
		);
	}
	return (await response.json()) as T;
}

export async function fetchVideoAsBase64(
	url: string,
	signal?: AbortSignal,
	headers?: Record<string, string>
): Promise<VideoGenerationResult> {
	const response = await fetch(url, { signal, headers, redirect: 'follow' });
	if (!response.ok) {
		throw new VideoProviderRequestError(`Failed to download generated video (${response.status}).`);
	}
	const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
	const mimeType = response.headers.get('content-type');
	return {
		base64,
		mimeType: mimeType?.startsWith('video/') ? mimeType : 'video/mp4',
	};
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
	throw new VideoProviderRequestError(`${providerName}: video generation timed out.`);
}
