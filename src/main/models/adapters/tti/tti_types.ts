export interface ImageProviderSpec {
	id: string;
	name: string;
	apiKey: string;
	baseURL?: string;
}

export interface ImageAdapterGenerationRequest {
	modelId: string;
	prompt: string;
	options?: Record<string, unknown>;
	signal?: AbortSignal;
}

export interface ImageGenerationResult {
	base64: string;
	mimeType: string;
}

export interface ImageAdapter {
	generate(request: ImageAdapterGenerationRequest): Promise<ImageGenerationResult>;
}
