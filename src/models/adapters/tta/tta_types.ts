export interface MusicProviderSpec {
	id: string;
	name: string;
	apiKey: string;
	baseURL?: string;
}

export interface MusicAdapterGenerationRequest {
	modelId: string;
	prompt: string;
	options?: Record<string, unknown>;
	signal?: AbortSignal;
}

export interface MusicGenerationResult {
	base64: string;
	mimeType: string;
}

export interface MusicAdapter {
	generate(request: MusicAdapterGenerationRequest): Promise<MusicGenerationResult>;
}
