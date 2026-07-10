export interface SoundRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
}

export interface SoundResult {
	base64: string;
	mimeType: string;
}

export interface SoundFile {
	name: string;
	path: string;
	createdAt: number;
}
