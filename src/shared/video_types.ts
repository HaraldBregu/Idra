export interface VideoRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
}

export interface VideoResult {
	base64: string;
	mimeType: string;
	path?: string;
}
