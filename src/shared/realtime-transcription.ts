import type { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from './agents/service';

export const REALTIME_TRANSCRIPTION_MAX_LANGUAGE_LENGTH = 35;
export const REALTIME_TRANSCRIPTION_MAX_AUDIO_CHARS = 256 * 1024;

export interface RealtimeTranscriptionStartRequest {
	language?: string;
}

export interface RealtimeTranscriptionSession {
	id: string;
	model: string;
	sampleRate: typeof REALTIME_TRANSCRIPTION_SAMPLE_RATE;
}

export type RealtimeTranscriptionEvent =
	| {
			type: 'started';
			sessionId: string;
			model: string;
	  }
	| {
			type: 'delta';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			delta: string;
	  }
	| {
			type: 'committed';
			sessionId: string;
			itemId: string;
	  }
	| {
			type: 'completed';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			transcript: string;
	  }
	| {
			type: 'error';
			sessionId?: string;
			message: string;
	  }
	| {
			type: 'closed';
			sessionId: string;
	  };

export function normalizeRealtimeTranscriptionStartRequest(
	request: unknown
): RealtimeTranscriptionStartRequest | undefined {
	if (request === undefined) return undefined;
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid realtime transcription start request.');
	}

	const language = (request as { language?: unknown }).language;
	if (language === undefined) return undefined;
	if (typeof language !== 'string') {
		throw new Error('Invalid realtime transcription language.');
	}

	const trimmed = language.trim();
	if (!trimmed) return undefined;
	if (trimmed.length > REALTIME_TRANSCRIPTION_MAX_LANGUAGE_LENGTH) {
		throw new Error('Realtime transcription language is too long.');
	}

	return { language: trimmed };
}

export function isRealtimeTranscriptionSessionId(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function isRealtimeTranscriptionAudioChunk(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= REALTIME_TRANSCRIPTION_MAX_AUDIO_CHARS &&
		/^[A-Za-z0-9+/]+={0,2}$/.test(value)
	);
}
