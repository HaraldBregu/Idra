import type {
	SttTranscriptionRequest,
	SttTranscriptionResult,
} from '../../shared/stt/transcription';

export interface SttProviderSpec {
	id: string;
	name: string;
	apiKey: string;
	baseURL?: string;
}

export interface SttAdapterTranscriptionRequest extends SttTranscriptionRequest {
	providerId: string;
	modelId: string;
	signal?: AbortSignal;
}

export interface SttAdapter {
	transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult>;
}
