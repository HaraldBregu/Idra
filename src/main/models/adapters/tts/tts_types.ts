import type {
	SpeechSynthesisRequest,
	SpeechSynthesisResult,
} from '../../../../shared/speech_types';

export interface SpeechProviderSpec {
	id: string;
	name: string;
	apiKey: string;
	baseURL: string;
}

export interface SpeechAdapterRequest extends SpeechSynthesisRequest {
	providerId: string;
	modelId: string;
}

export interface SpeechAdapter {
	synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult>;
}
