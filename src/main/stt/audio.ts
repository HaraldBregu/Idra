import { Buffer } from 'node:buffer';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../shared/agents/service';

const PCM_BYTES_PER_SAMPLE = 2;
const MINIMUM_COMMIT_AUDIO_MS = 100;
const STREAMING_COMMIT_AUDIO_MS = 300;

export const MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES =
	(REALTIME_TRANSCRIPTION_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE * MINIMUM_COMMIT_AUDIO_MS) / 1_000;

export const STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES =
	(REALTIME_TRANSCRIPTION_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE * STREAMING_COMMIT_AUDIO_MS) / 1_000;

export function decodedRealtimeTranscriptionAudioByteLength(audio: string): number {
	const trimmed = audio.trim();
	if (!trimmed) return 0;
	return Buffer.byteLength(trimmed, 'base64');
}

export function hasMinimumRealtimeTranscriptionAudio(audioByteLength: number): boolean {
	return audioByteLength >= MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES;
}

export function hasStreamingRealtimeTranscriptionAudio(audioByteLength: number): boolean {
	return audioByteLength >= STREAMING_REALTIME_TRANSCRIPTION_COMMIT_BYTES;
}
