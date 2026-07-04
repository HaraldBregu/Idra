export interface ImageRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
}

export interface ImageResult {
	base64: string;
	mimeType: string;
}
