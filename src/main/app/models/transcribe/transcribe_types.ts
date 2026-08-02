import type {
	SttAudioInput,
	SttRealtimeEvent,
	SttRealtimeSession,
	SttRealtimeStartRequest,
	SttTranscriptionResult,
} from '../../../../shared/stt_transcription';

export type { SttRealtimeEvent, SttRealtimeSession, SttTranscriptionResult };

export interface TranscribeToTextRequest {
	audio: SttAudioInput;
	providerId?: string;
	modelId?: string;
	language?: string;
	prompt?: string;
	temperature?: number;
}

export type TranscribeRealtimeStartRequest = SttRealtimeStartRequest;
