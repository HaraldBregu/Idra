import type { Provider } from './providers';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from './realtime-transcription';
import type { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from './agents/service';
import type { Model } from './agents/service';

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
	readonly sampleRate: typeof REALTIME_TRANSCRIPTION_SAMPLE_RATE;
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
