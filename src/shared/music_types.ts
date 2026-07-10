export interface MusicRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
}

export interface MusicResult {
	base64: string;
	mimeType: string;
}
