export const TEXT_TO_SPEECH_MAX_TEXT_LENGTH = 20_000;
export const TEXT_TO_SPEECH_AUDIO_FORMATS = ['mp3', 'wav', 'opus', 'pcm'];
export function normalizeTextToSpeechSynthesisRequest(request) {
    const source = typeof request === 'string' ? { text: request } : request;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
        throw new Error('Invalid text-to-speech synthesis request.');
    }
    if (typeof source.text !== 'string') {
        throw new Error('Text-to-speech text must be a string.');
    }
    const text = source.text.trim();
    if (!text)
        throw new Error('Text-to-speech text is required.');
    if (text.length > TEXT_TO_SPEECH_MAX_TEXT_LENGTH) {
        throw new Error('Text-to-speech text is too long.');
    }
    const voiceId = typeof source.voiceId === 'string' && source.voiceId.trim()
        ? source.voiceId.trim()
        : undefined;
    const format = source.format;
    if (format !== undefined && !TEXT_TO_SPEECH_AUDIO_FORMATS.includes(format)) {
        throw new Error(`Unsupported text-to-speech audio format: ${String(format)}`);
    }
    return {
        text,
        ...(voiceId ? { voiceId } : {}),
        ...(format ? { format } : {}),
    };
}
