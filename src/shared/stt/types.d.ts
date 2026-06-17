export declare const TEXT_TO_SPEECH_MAX_TEXT_LENGTH = 20000;
export declare const TEXT_TO_SPEECH_AUDIO_FORMATS: readonly ["mp3", "wav", "opus", "pcm"];
export type TextToSpeechAudioFormat = (typeof TEXT_TO_SPEECH_AUDIO_FORMATS)[number];
export interface TextToSpeechSynthesisRequest {
    text: string;
    voiceId?: string;
    format?: TextToSpeechAudioFormat;
}
export interface TextToSpeechAudioOutput {
    data: string;
    encoding: 'base64';
    mimeType: string;
    byteLength: number;
}
export interface TextToSpeechSynthesisMetadata {
    providerId: string;
    providerName: string;
    modelId: string;
    modelName: string;
    format: TextToSpeechAudioFormat;
    voiceId?: string;
    createdAt: string;
}
export interface TextToSpeechSynthesisResult {
    audio: TextToSpeechAudioOutput;
    metadata: TextToSpeechSynthesisMetadata;
}
export declare function normalizeTextToSpeechSynthesisRequest(request: TextToSpeechSynthesisRequest | string): TextToSpeechSynthesisRequest;
