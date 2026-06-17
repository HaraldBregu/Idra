import type { PublicProvider } from '../providers';
import type { ProviderModel } from '../providers/models/types';
export declare const STT_AUDIO_ENCODINGS: readonly ["base64"];
export declare const STT_MAX_AUDIO_BASE64_LENGTH: number;
export declare const STT_MAX_REALTIME_AUDIO_BASE64_LENGTH: number;
export declare const STT_MAX_LANGUAGE_LENGTH = 35;
export declare const STT_MAX_PROMPT_LENGTH = 2000;
export declare const STT_DEFAULT_REALTIME_SAMPLE_RATE = 24000;
export type SttAudioEncoding = (typeof STT_AUDIO_ENCODINGS)[number];
export type SttRealtimeAudioFormat = 'pcm16';
export interface SttAudioInput {
    data: string;
    encoding: SttAudioEncoding;
    mimeType: string;
    fileName?: string;
    byteLength?: number;
}
export interface SttTranscriptionRequest {
    audio: SttAudioInput;
    providerId?: string;
    modelId?: string;
    language?: string;
    prompt?: string;
    temperature?: number;
}
export interface SttRealtimeStartRequest {
    providerId?: string;
    modelId?: string;
    language?: string;
    prompt?: string;
    sampleRate?: number;
}
export interface SttRealtimeSession {
    id: string;
    providerId: string;
    providerName: string;
    modelId: string;
    sampleRate: number;
    format: SttRealtimeAudioFormat;
}
export type SttRealtimeEvent = {
    type: 'started';
    sessionId: string;
    providerId: string;
    model: string;
} | {
    type: 'delta';
    sessionId: string;
    itemId: string;
    contentIndex: number;
    delta: string;
} | {
    type: 'committed';
    sessionId: string;
    itemId: string;
} | {
    type: 'completed';
    sessionId: string;
    itemId: string;
    contentIndex: number;
    transcript: string;
} | {
    type: 'error';
    sessionId?: string;
    message: string;
} | {
    type: 'closed';
    sessionId: string;
};
export interface SttUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    durationSeconds?: number;
}
export interface SttTranscriptionMetadata {
    providerId: string;
    providerName: string;
    modelId: string;
    language?: string;
    createdAt: string;
    usage?: SttUsage;
}
export interface SttTranscriptionResult {
    text: string;
    metadata: SttTranscriptionMetadata;
}
export interface SttModelSelection {
    provider: PublicProvider;
    model: ProviderModel;
}
export declare function normalizeSttTranscriptionRequest(request: SttTranscriptionRequest): SttTranscriptionRequest;
export declare function normalizeSttRealtimeStartRequest(request?: SttRealtimeStartRequest): SttRealtimeStartRequest;
export declare function normalizeSttRealtimeAudioChunk(audio: string): string;
