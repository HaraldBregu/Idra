import { buildMusicAdapter } from './tta_factory';
import type { MusicGenerationResult } from './tta_types';

export interface GenerateMusicOptions {
	providerId: string;
	apiKey: string;
	modelId: string;
	prompt: string;
	options?: Record<string, unknown>;
	baseURL?: string;
	signal?: AbortSignal;
}

export async function generateMusic(options: GenerateMusicOptions): Promise<MusicGenerationResult> {
	const adapter = buildMusicAdapter({
		id: options.providerId,
		name: options.providerId,
		apiKey: options.apiKey,
		baseURL: options.baseURL,
	});
	return adapter.generate({
		modelId: options.modelId,
		prompt: options.prompt,
		options: options.options,
		signal: options.signal,
	});
}
