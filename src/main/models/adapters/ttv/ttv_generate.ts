import { buildVideoAdapter } from './ttv_factory';
import type { VideoGenerationResult } from './ttv_types';

export interface GenerateVideoOptions {
	providerId: string;
	apiKey: string;
	modelId: string;
	prompt: string;
	options?: Record<string, unknown>;
	baseURL?: string;
	signal?: AbortSignal;
}

export async function generateVideo(options: GenerateVideoOptions): Promise<VideoGenerationResult> {
	const adapter = buildVideoAdapter({
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
