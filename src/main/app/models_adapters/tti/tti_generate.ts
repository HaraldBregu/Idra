import { buildImageAdapter } from './tti_factory';
import type { ImageGenerationResult } from './tti_types';

export interface GenerateImageOptions {
	providerId: string;
	apiKey: string;
	modelId: string;
	prompt: string;
	baseURL?: string;
	signal?: AbortSignal;
}

export async function generateImage(options: GenerateImageOptions): Promise<ImageGenerationResult> {
	const adapter = buildImageAdapter({
		id: options.providerId,
		name: options.providerId,
		apiKey: options.apiKey,
		baseURL: options.baseURL,
	});
	return adapter.generate({
		modelId: options.modelId,
		prompt: options.prompt,
		signal: options.signal,
	});
}
