export interface ImageRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
	/** Provider-specific generation controls declared in the model metadata. */
	options?: Record<string, unknown>;
}

export interface ImageResult {
	base64: string;
	mimeType: string;
}
