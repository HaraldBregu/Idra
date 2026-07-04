export interface CreatorImageRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
}

export interface CreatorImageResult {
	base64: string;
	mimeType: string;
}
