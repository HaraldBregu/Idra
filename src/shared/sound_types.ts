export interface SoundRequest {
	prompt: string;
	providerId?: string;
	modelId?: string;
	/** Provider-specific generation controls declared in the model metadata. */
	options?: Record<string, unknown>;
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
