import type {
	SttAudioInput,
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttTranscriptionResult,
} from '../../shared/stt/transcription';

export type { SttRealtimeEvent, SttRealtimeSession, SttTranscriptionResult };

export interface VoiceToTextRequest {
	audio: SttAudioInput;
	providerId?: string;
	modelId?: string;
	language?: string;
	prompt?: string;
	temperature?: number;
}

export type VoiceRealtimeStartRequest = SttRealtimeStartRequest;
