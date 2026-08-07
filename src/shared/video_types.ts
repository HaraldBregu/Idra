export interface VideoRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
	/** Provider-specific generation controls declared in the model metadata. */
	options?: Record<string, unknown>;
}

export interface VideoResult {
	base64: string;
	mimeType: string;
	path?: string;
}
