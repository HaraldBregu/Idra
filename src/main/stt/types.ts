import type { Provider } from '../../shared/providers';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import type { ConfiguredModelOperator, Model } from '../../shared/service';

export interface SpeechToTextSessionCallbacks {
	emit: (event: RealtimeTranscriptionEvent) => void;
	closed: (sessionId: string) => void;
}

export interface SpeechToTextRuntimeConfig {
	sessionId: string;
	provider: Provider;
	operator: ConfiguredModelOperator;
	model: Model;
	request?: RealtimeTranscriptionStartRequest;
	callbacks: SpeechToTextSessionCallbacks;
}

export interface SpeechToTextRealtimeSession {
	readonly id: string;
	readonly model: string;
	readonly sampleRate: number;
	start: () => Promise<RealtimeTranscriptionSession>;
	appendAudio: (audio: string) => void;
	finish: () => void;
	cancel: () => void;
	close: () => void;
}

export interface SpeechToTextRealtimeAdapter {
	supports: (providerId: string, modelId: string) => boolean;
	startSession: (config: SpeechToTextRuntimeConfig) => Promise<SpeechToTextRealtimeSession>;
}
