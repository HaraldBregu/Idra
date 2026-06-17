import type { SttAudioInput } from '@shared/stt/transcription';
export declare function fileToSttAudioInput(file: File): Promise<SttAudioInput>;
export declare function appendTranscriptionText(baseText: string, transcript: string): string;
