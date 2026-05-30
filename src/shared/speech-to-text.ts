import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from './realtime-transcription';
import {
	isRealtimeTranscriptionAudioChunk,
	isRealtimeTranscriptionSessionId,
	normalizeRealtimeTranscriptionStartRequest,
} from './realtime-transcription';

export const SPEECH_TO_TEXT_MAX_AUDIO_CHARS = 16 * 1024 * 1024;

export interface SpeechToTextTranscribeRequest {
	audio: string;
	language?: string;
}

export interface SpeechToTextTranscription {
	transcript: string;
	model: string;
}

export type SpeechToTextDictationStartRequest = RealtimeTranscriptionStartRequest;
export type SpeechToTextDictationSession = RealtimeTranscriptionSession;
export type SpeechToTextEvent = RealtimeTranscriptionEvent;

export function normalizeSpeechToTextTranscribeRequest(
	request: unknown
): SpeechToTextTranscribeRequest {
	if (!request || typeof request !== 'object' || Array.isArray(request)) {
		throw new Error('Invalid speech-to-text request.');
	}

	const record = request as { audio?: unknown; language?: unknown };
	const audio = normalizeSpeechToTextAudio(record.audio);
	const startRequest = normalizeRealtimeTranscriptionStartRequest({
		language: record.language,
	});

	return {
		audio,
		...(startRequest?.language ? { language: startRequest.language } : {}),
	};
}

export function normalizeSpeechToTextDictationStartRequest(
	request: unknown
): SpeechToTextDictationStartRequest | undefined {
	return normalizeRealtimeTranscriptionStartRequest(request);
}

export function isSpeechToTextSessionId(value: unknown): value is string {
	return isRealtimeTranscriptionSessionId(value);
}

export function isSpeechToTextAudioChunk(value: unknown): value is string {
	return isRealtimeTranscriptionAudioChunk(value);
}

function normalizeSpeechToTextAudio(value: unknown): string {
	if (typeof value !== 'string') {
		throw new Error('Invalid speech-to-text audio.');
	}

	const trimmed = value.trim();
	if (!trimmed || !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
		throw new Error('Invalid speech-to-text audio.');
	}
	if (trimmed.length > SPEECH_TO_TEXT_MAX_AUDIO_CHARS) {
		throw new Error('Speech-to-text audio is too large.');
	}

	return trimmed;
}
