import type { Provider } from '../../shared/providers';

export interface TextToImageAssetReference {
	type: 'workspace-file' | 'local-file' | 'remote-url';
	path?: string;
	url?: string;
	mimeType?: string;
	description?: string;
}

export interface TextToImageRequest {
	prompt: string;
	negativePrompt?: string;
	aspectRatio?: string;
	count?: number;
	seed?: number;
	styleHints?: string[];
	references?: TextToImageAssetReference[];
}

export interface TextToImageResultRecord {
	assetUrl?: string;
	localFile?: string;
	mimeType?: string;
	width?: number;
	height?: number;
	providerId: string;
	modelId: string;
	jobId?: string;
}

export interface TextToImageResult {
	providerId: string;
	modelId: string;
	images: TextToImageResultRecord[];
}

export interface TextToImageAdapterContext {
	provider: Provider;
	modelId: string;
	signal?: AbortSignal;
}

export interface TextToImageAdapter {
	create(
		request: TextToImageRequest,
		context: TextToImageAdapterContext
	): Promise<Omit<TextToImageResultRecord, 'providerId' | 'modelId'>[]>;
}
